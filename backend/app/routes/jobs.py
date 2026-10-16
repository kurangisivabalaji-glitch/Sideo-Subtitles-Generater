import uuid
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.models.job import TranscriptionJob
from app.models.subtitle import Subtitle
from app.schemas.job import JobResponse, JobListResponse
from app.core.deps import get_current_active_user
from app.core.rate_limiter import limiter
from app.core.storage import storage_service
from app.queue.job_queue import job_queue
from app.services.ffmpeg_service import get_video_info, VideoValidationError
from app.config import (
    SUPPORTED_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES,
    SUPPORTED_WHISPER_MODELS,
    DEFAULT_WHISPER_MODEL,
    UPLOAD_DIR,
    RATE_LIMIT_UPLOAD
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["Transcription Jobs"])

@router.post("", response_model=JobResponse)
@limiter.limit(RATE_LIMIT_UPLOAD)
async def create_transcription_job(
    request: Request,
    file: UploadFile = File(...),
    model: str = Form(DEFAULT_WHISPER_MODEL),
    language: str = Form("auto"),
    target_language: Optional[str] = Form(None),
    idempotency_key: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Idempotency Check
    if idempotency_key:
        existing_job = db.query(TranscriptionJob).filter(
            TranscriptionJob.idempotency_key == idempotency_key,
            TranscriptionJob.user_id == current_user.id
        ).first()
        if existing_job:
            logger.info(f"Idempotent request match for key: {idempotency_key}. Returning job {existing_job.id}")
            return existing_job

    # 2. Validate Extension
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{file_ext}'. Allowed: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    # 3. Model validation
    if model not in SUPPORTED_WHISPER_MODELS:
        model = DEFAULT_WHISPER_MODEL

    # 4. Stream & Save upload to temp storage
    file_uuid = str(uuid.uuid4())
    safe_filename = f"{file_uuid}{file_ext}"
    local_temp_path = UPLOAD_DIR / safe_filename

    try:
        bytes_read = 0
        with open(local_temp_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                bytes_read += len(chunk)
                if bytes_read > MAX_UPLOAD_SIZE_BYTES:
                    buffer.close()
                    local_temp_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds maximum upload size of {MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB"
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        local_temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to receive upload: {e}")

    # 5. Media Validation & Probing
    try:
        video_meta = get_video_info(local_temp_path)
    except VideoValidationError as e:
        local_temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=str(e))

    if not video_meta.get("has_audio"):
        local_temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Video contains no audio stream to transcribe.")

    # 6. User Tier Duration Quota Check
    duration = video_meta.get("duration", 0.0)
    if current_user.role != "admin" and duration > current_user.max_duration_seconds:
        local_temp_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=403,
            detail=f"Video length ({int(duration)}s) exceeds your tier quota of {current_user.max_duration_seconds}s. Upgrade your tier to transcribe longer videos."
        )

    # 7. Persist to storage backend (Local or S3)
    storage_path = storage_service.save_file(local_temp_path, safe_filename)

    # 8. Create DB Video record
    video_record = Video(
        user_id=current_user.id,
        title=Path(file.filename or "video").stem,
        original_filename=file.filename or safe_filename,
        storage_path=storage_path,
        storage_backend=storage_service.backend,
        duration=duration,
        file_size_bytes=bytes_read,
        width=video_meta.get("width", 1920),
        height=video_meta.get("height", 1080),
        video_codec=video_meta.get("video_codec"),
        audio_codec=video_meta.get("audio_codec"),
        has_audio=True
    )
    db.add(video_record)
    db.flush()

    # 9. Create DB TranscriptionJob record
    job_record = TranscriptionJob(
        user_id=current_user.id,
        video_id=video_record.id,
        status="QUEUED",
        stage="Queued for AI worker...",
        progress=0,
        model_size=model,
        requested_language=language,
        target_language=target_language,
        idempotency_key=idempotency_key
    )
    db.add(job_record)
    db.commit()
    db.refresh(job_record)

    # 10. Submit to Background Worker Queue
    job_queue.submit_job(job_record.id)

    return job_record

@router.get("", response_model=JobListResponse)
def list_user_jobs(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Strict per-user isolation: Only fetch jobs belonging to current_user
    query = db.query(TranscriptionJob).filter(TranscriptionJob.user_id == current_user.id)

    if status_filter:
        query = query.filter(TranscriptionJob.status == status_filter.upper())

    if search:
        query = query.join(Video).filter(Video.title.ilike(f"%{search}%"))

    total = query.count()
    jobs = query.order_by(TranscriptionJob.created_at.desc()).offset((page - 1) * size).limit(size).all()

    return {
        "total": total,
        "page": page,
        "size": size,
        "jobs": jobs
    }

@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id)
    # Admin can view any job, ordinary users only their own
    if current_user.role != "admin":
        query = query.filter(TranscriptionJob.user_id == current_user.id)

    job = query.first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied")

    return job

@router.post("/{job_id}/cancel")
def cancel_job_endpoint(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id)
    if current_user.role != "admin":
        query = query.filter(TranscriptionJob.user_id == current_user.id)

    job = query.first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in ("COMPLETED", "FAILED", "CANCELLED"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in {job.status} state")

    success = job_queue.cancel_job(job.id)
    return {"message": "Job cancellation initiated", "success": success}

@router.post("/{job_id}/retry", response_model=JobResponse)
def retry_job_endpoint(
    job_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    query = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id)
    if current_user.role != "admin":
        query = query.filter(TranscriptionJob.user_id == current_user.id)

    job = query.first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "QUEUED"
    job.stage = "Job re-queued for processing."
    job.progress = 0
    job.error_message = None
    job.retry_count += 1
    db.commit()

    job_queue.submit_job(job.id)
    return job
