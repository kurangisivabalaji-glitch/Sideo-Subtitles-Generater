import shutil
import logging
import threading
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.config import (
    UPLOAD_DIR,
    TEMP_DIR,
    SUPPORTED_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
    DEFAULT_WHISPER_MODEL,
    SUPPORTED_WHISPER_MODELS,
)
from app.services.ffmpeg_service import get_video_info, extract_audio, VideoValidationError, AudioExtractionError
from app.services.whisper_service import transcribe_audio, LANGUAGE_METADATA
from app.services.job_manager import job_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Transcribe"])

def _process_transcription_job(job_id: str, video_path: Path, model_name: str, language: str, total_duration: float):
    """Background worker function for audio extraction and transcription."""
    audio_wav_path = TEMP_DIR / f"{job_id}.wav"
    try:
        # Step 1: Audio Extraction
        job_manager.update_job(job_id, status="processing", progress=5, step="Extracting audio from video...")
        extract_audio(video_path, audio_wav_path)

        # Step 2: Transcription with progress callback
        def on_progress(pct: int, msg: str):
            job_manager.update_job(job_id, progress=pct, step=msg)

        job_manager.update_job(job_id, progress=15, step=f"Loading {model_name} speech-recognition model...")
        transcription_result = transcribe_audio(
            audio_path=audio_wav_path,
            model_name=model_name,
            language=language,
            total_duration=total_duration,
            progress_callback=on_progress
        )

        job_manager.update_job(
            job_id,
            status="completed",
            progress=100,
            step="Transcription completed successfully!",
            result=transcription_result
        )

    except (VideoValidationError, AudioExtractionError) as e:
        logger.error(f"Media error in job {job_id}: {str(e)}")
        job_manager.update_job(job_id, status="failed", error=str(e), step="Error processing media")
    except Exception as e:
        logger.exception(f"Unexpected error in job {job_id}: {str(e)}")
        job_manager.update_job(job_id, status="failed", error=f"Transcription failed: {str(e)}", step="Error in transcription")
    finally:
        # Clean up temporary WAV audio
        if audio_wav_path.exists():
            try:
                audio_wav_path.unlink()
            except Exception:
                pass

@router.post("/transcribe")
async def start_transcription(
    file: UploadFile = File(...),
    model: str = Form(DEFAULT_WHISPER_MODEL),
    language: str = Form("auto"),
):
    # Validate extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{file_ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    # Validate model
    if model not in SUPPORTED_WHISPER_MODELS:
        model = DEFAULT_WHISPER_MODEL

    # Create job
    job_id = job_manager.create_job(metadata={"filename": file.filename, "model": model, "language": language})
    safe_filename = f"{job_id}{file_ext}"
    saved_video_path = UPLOAD_DIR / safe_filename

    # Save uploaded file
    try:
        bytes_read = 0
        with open(saved_video_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                bytes_read += len(chunk)
                if bytes_read > MAX_UPLOAD_SIZE_BYTES:
                    buffer.close()
                    saved_video_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video file exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        saved_video_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Validate video and audio streams
    try:
        video_info = get_video_info(saved_video_path)
    except VideoValidationError as e:
        saved_video_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    if not video_info.get("has_audio"):
        saved_video_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="The uploaded video does not contain an audio track. Please upload a video with speech or audio."
        )

    # Start background processing thread
    thread = threading.Thread(
        target=_process_transcription_job,
        args=(job_id, saved_video_path, model, language, video_info["duration"]),
        daemon=True
    )
    thread.start()

    return {
        "job_id": job_id,
        "video_filename": safe_filename,
        "video_url": f"/media/uploads/{safe_filename}",
        "duration": video_info["duration"],
        "width": video_info["width"],
        "height": video_info["height"],
        "size": video_info["size"],
    }

@router.get("/transcribe/status/{job_id}")
@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/languages")
async def get_languages():
    langs = []
    for code, meta in LANGUAGE_METADATA.items():
        langs.append({
            "code": code,
            "name": meta["name"],
            "native": meta["native"],
            "rtl": meta.get("rtl", False)
        })
    return {"languages": langs}

@router.get("/models")
async def get_models():
    models_info = [
        {"id": "tiny", "name": "Tiny (~75 MB)", "speed": "Ultra Fast", "recommended": "Quick previews"},
        {"id": "base", "name": "Base (~145 MB)", "speed": "Fast & Balanced (Recommended)", "recommended": "General use"},
        {"id": "small", "name": "Small (~460 MB)", "speed": "Moderate", "recommended": "Higher multilingual accuracy"},
        {"id": "medium", "name": "Medium (~1.5 GB)", "speed": "Slower", "recommended": "Complex audio"},
        {"id": "large-v3", "name": "Large v3 (~3.1 GB)", "speed": "Heavy", "recommended": "Highest accuracy"},
    ]
    return {"models": models_info, "default": DEFAULT_WHISPER_MODEL}
