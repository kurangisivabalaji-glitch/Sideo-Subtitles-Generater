import time
import logging
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Set
from concurrent.futures import ThreadPoolExecutor

from app.config import (
    MAX_CONCURRENT_JOBS,
    MAX_QUEUE_SIZE,
    TEMP_DIR,
    JOB_TIMEOUT_SECONDS
)
from app.db.session import SessionLocal
from app.models.job import TranscriptionJob
from app.models.subtitle import Subtitle
from app.models.video import Video
from app.models.usage import UsageRecord
from app.services.ffmpeg_service import extract_audio, AudioExtractionError, VideoValidationError
from app.services.whisper_service import transcribe_audio, LANGUAGE_METADATA
from app.services.translator_service import translate_segments
from app.core.storage import storage_service

logger = logging.getLogger(__name__)

# Event listener subscriptions for WebSockets & SSE
_EVENT_LISTENERS: Dict[str, Set[Any]] = {}  # job_id -> set of callback queues/callables
_EVENT_LOCK = threading.Lock()

def register_job_listener(job_id: str, callback):
    with _EVENT_LOCK:
        if job_id not in _EVENT_LISTENERS:
            _EVENT_LISTENERS[job_id] = set()
        _EVENT_LISTENERS[job_id].add(callback)

def unregister_job_listener(job_id: str, callback):
    with _EVENT_LOCK:
        if job_id in _EVENT_LISTENERS:
            _EVENT_LISTENERS[job_id].discard(callback)
            if not _EVENT_LISTENERS[job_id]:
                del _EVENT_LISTENERS[job_id]

def broadcast_job_event(job_id: str, event_data: dict):
    with _EVENT_LOCK:
        listeners = list(_EVENT_LISTENERS.get(job_id, []))
    for listener in listeners:
        try:
            listener(event_data)
        except Exception as e:
            logger.debug(f"Error dispatching listener event: {e}")

class ProductionJobQueue:
    def __init__(self, max_workers: int = MAX_CONCURRENT_JOBS):
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="WhisperWorker")
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.cancelled_job_ids: Set[str] = set()
        self._lock = threading.Lock()

    def submit_job(self, job_id: str):
        """Submit a queued job to the worker pool."""
        with self._lock:
            self.active_jobs[job_id] = {
                "started_at": time.time(),
                "status": "QUEUED"
            }
        self.executor.submit(self._worker_execute, job_id)

    def cancel_job(self, job_id: str) -> bool:
        """Mark a job for cancellation."""
        with self._lock:
            self.cancelled_job_ids.add(job_id)
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["status"] = "CANCELLED"
        
        # Update DB immediately
        db = SessionLocal()
        try:
            job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
            if job and job.status not in ("COMPLETED", "FAILED"):
                job.status = "CANCELLED"
                job.stage = "Job was cancelled by user."
                job.completed_at = datetime.utcnow()
                db.commit()
                broadcast_job_event(job_id, {
                    "job_id": job_id,
                    "status": "CANCELLED",
                    "progress": 0,
                    "stage": "Job cancelled."
                })
                return True
        finally:
            db.close()
        return False

    def is_cancelled(self, job_id: str) -> bool:
        with self._lock:
            return job_id in self.cancelled_job_ids

    def _worker_execute(self, job_id: str):
        """Worker thread execution."""
        if self.is_cancelled(job_id):
            return

        db = SessionLocal()
        audio_wav_path = TEMP_DIR / f"{job_id}.wav"

        try:
            job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
            if not job or job.status == "CANCELLED":
                return

            video = db.query(Video).filter(Video.id == job.video_id).first()
            if not video:
                raise ValueError("Associated video record not found.")

            # Update status to PROCESSING
            job.status = "PROCESSING"
            job.started_at = datetime.utcnow()
            job.stage = "Extracting audio from video..."
            job.progress = 5
            db.commit()

            broadcast_job_event(job_id, {
                "job_id": job_id,
                "status": "PROCESSING",
                "progress": 5,
                "stage": "Extracting audio from video..."
            })

            # Retrieve physical video file path
            video_path = storage_service.get_file_path(video.storage_path)

            if self.is_cancelled(job_id):
                return

            # Step 1: Extract 16kHz mono WAV for Whisper
            extract_audio(video_path, audio_wav_path)

            if self.is_cancelled(job_id):
                return

            # Step 2: Transcribe via Whisper with progress updates
            def on_progress(pct: int, msg: str):
                if self.is_cancelled(job_id):
                    return
                # Update DB and broadcast
                job.progress = pct
                job.stage = msg
                try:
                    db.commit()
                except Exception:
                    pass
                broadcast_job_event(job_id, {
                    "job_id": job_id,
                    "status": "PROCESSING",
                    "progress": pct,
                    "stage": msg
                })

            result = transcribe_audio(
                audio_path=audio_wav_path,
                model_name=job.model_size,
                language=job.requested_language,
                total_duration=video.duration,
                progress_callback=on_progress
            )

            if self.is_cancelled(job_id):
                return

            # Step 3: Save generated subtitles in database
            detected_lang = result.get("language", "en")
            lang_meta = LANGUAGE_METADATA.get(detected_lang, {})
            lang_name = lang_meta.get("name", detected_lang.upper())

            job.detected_language = detected_lang
            job.language_confidence = result.get("language_probability", 1.0)
            # Create Original Subtitle record
            subtitle_record = Subtitle(
                job_id=job.id,
                user_id=job.user_id,
                track_type="original",
                language_code=detected_lang,
                language_name=lang_name,
                segments=result.get("segments", [])
            )
            db.add(subtitle_record)

            # Check if user requested automatic translation into a target language
            if job.target_language and job.target_language.strip().lower() not in ("none", "auto", detected_lang.lower()):
                try:
                    job.stage = f"Translating subtitles to {job.target_language.upper()}..."
                    job.progress = 96
                    db.commit()
                    broadcast_job_event(job_id, {
                        "job_id": job_id,
                        "status": "PROCESSING",
                        "progress": 96,
                        "stage": f"Translating subtitles into target language..."
                    })

                    trans_result = translate_segments(
                        segments=result.get("segments", []),
                        target_language=job.target_language,
                        source_language=detected_lang
                    )

                    trans_sub = Subtitle(
                        job_id=job.id,
                        user_id=job.user_id,
                        track_type="translated",
                        language_code=trans_result.get("target_language", job.target_language),
                        language_name=trans_result.get("target_language_name", job.target_language.upper()),
                        segments=trans_result.get("segments", [])
                    )
                    db.add(trans_sub)
                    logger.info(f"Auto-translation generated for job {job_id} in {job.target_language}")
                except Exception as trans_err:
                    logger.warning(f"Auto-translation failed for job {job_id}: {trans_err}")

            job.progress = 100
            job.stage = "Completed successfully."
            job.status = "COMPLETED"
            job.completed_at = datetime.utcnow()

            # Record usage
            usage = UsageRecord(
                user_id=job.user_id,
                action="transcription",
                duration_seconds=video.duration,
                model_used=job.model_size
            )
            db.add(usage)

            # Update user's monthly transcribed seconds
            if job.user:
                job.user.monthly_transcribed_seconds = (job.user.monthly_transcribed_seconds or 0) + int(video.duration)

            db.commit()

            broadcast_job_event(job_id, {
                "job_id": job_id,
                "status": "COMPLETED",
                "progress": 100,
                "stage": "Completed successfully.",
                "detected_language": detected_lang,
                "language_name": lang_name,
                "confidence": result.get("language_probability")
            })

            logger.info(f"Job {job_id} completed successfully in {detected_lang}")

        except Exception as e:
            logger.exception(f"Error executing job {job_id}: {str(e)}")
            try:
                db.rollback()
                job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
                if job:
                    job.status = "FAILED"
                    job.error_message = str(e)[:1000]
                    job.stage = f"Error: {str(e)[:120]}"
                    job.completed_at = datetime.utcnow()
                    db.commit()

                broadcast_job_event(job_id, {
                    "job_id": job_id,
                    "status": "FAILED",
                    "progress": 0,
                    "error": str(e),
                    "stage": "Failed processing"
                })
            except Exception as db_err:
                logger.error(f"Failed to record job failure in DB: {db_err}")
        finally:
            db.close()
            with self._lock:
                self.active_jobs.pop(job_id, None)
                self.cancelled_job_ids.discard(job_id)
            if audio_wav_path.exists():
                try:
                    audio_wav_path.unlink()
                except Exception:
                    pass

    def recover_stale_jobs(self):
        """Recovers any jobs left in PROCESSING state after server restart."""
        db = SessionLocal()
        try:
            stale = db.query(TranscriptionJob).filter(
                TranscriptionJob.status.in_(["PROCESSING", "UPLOADING"])
            ).all()
            for job in stale:
                logger.warning(f"Recovering stale job {job.id} from previous run...")
                if job.retry_count < 2:
                    job.status = "QUEUED"
                    job.stage = "Re-queued following worker recovery."
                    job.retry_count += 1
                    db.commit()
                    self.submit_job(job.id)
                else:
                    job.status = "FAILED"
                    job.stage = "Failed: Worker terminated unexpectedly."
                    job.error_message = "Job exceeded maximum retry attempts after server restart."
                    db.commit()
        except Exception as e:
            logger.error(f"Error recovering stale jobs: {e}")
        finally:
            db.close()

# Global production job queue
job_queue = ProductionJobQueue()
