import uuid
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.job import TranscriptionJob
from app.models.video import Video
from app.models.subtitle import Subtitle
from app.models.file import GeneratedFile
from app.core.deps import get_current_active_user, get_optional_current_user
from app.core.storage import storage_service
from app.services.subtitle_service import segments_to_srt, segments_to_vtt
from app.services.ffmpeg_service import burn_subtitles_to_video, SubtitleBurnError
from app.config import OUTPUT_DIR, UPLOAD_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["Export & Downloads"])

class DirectExportRequest(BaseModel):
    segments: List[Dict[str, Any]]
    filename: Optional[str] = "subtitles"

class BurnVideoJobRequest(BaseModel):
    track_type: str = "original"  # "original" or "translated"
    style: Optional[Dict[str, Any]] = None

class DirectBurnVideoRequest(BaseModel):
    video_filename: Optional[str] = None
    job_id: Optional[str] = None
    segments: Optional[List[Dict[str, Any]]] = None
    style: Optional[Dict[str, Any]] = None
    track_type: Optional[str] = "original"

@router.get("/{job_id}/srt")
def export_job_srt(
    job_id: str,
    track: str = Query("original"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    subtitle = db.query(Subtitle).filter(
        Subtitle.job_id == job_id,
        Subtitle.track_type == track
    ).first()

    if not subtitle or not subtitle.segments:
        raise HTTPException(status_code=404, detail=f"No {track} subtitles available for this job")

    srt_text = segments_to_srt(subtitle.segments)
    content = ("\ufeff" + srt_text).encode("utf-8")
    filename = f"{Path(job.video.title if job.video else 'subtitles').stem}_{subtitle.language_code}.srt"

    return Response(
        content=content,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{job_id}/vtt")
def export_job_vtt(
    job_id: str,
    track: str = Query("original"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    subtitle = db.query(Subtitle).filter(
        Subtitle.job_id == job_id,
        Subtitle.track_type == track
    ).first()

    if not subtitle or not subtitle.segments:
        raise HTTPException(status_code=404, detail=f"No {track} subtitles available for this job")

    vtt_text = segments_to_vtt(subtitle.segments)
    filename = f"{Path(job.video.title if job.video else 'subtitles').stem}_{subtitle.language_code}.vtt"

    return Response(
        content=vtt_text.encode("utf-8"),
        media_type="text/vtt",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/{job_id}/json")
def export_job_json(
    job_id: str,
    track: str = Query("original"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    import json
    job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    subtitle = db.query(Subtitle).filter(
        Subtitle.job_id == job_id,
        Subtitle.track_type == track
    ).first()

    if not subtitle or not subtitle.segments:
        raise HTTPException(status_code=404, detail=f"No {track} subtitles available for this job")

    payload = {
        "job_id": job.id,
        "language": subtitle.language_code,
        "track": subtitle.track_type,
        "segments": subtitle.segments
    }
    content = json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")
    filename = f"{Path(job.video.title if job.video else 'subtitles').stem}_{subtitle.language_code}.json"

    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/burn-video")
def direct_burn_video(
    payload: DirectBurnVideoRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    source_video_path = None
    job = None

    # 1. Resolve via job_id if provided
    if payload.job_id:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.id == payload.job_id).first()
        if job and job.video:
            source_video_path = storage_service.get_file_path(job.video.storage_path)

    # 2. Resolve via video_filename
    if not source_video_path and payload.video_filename:
        # Check direct upload directory
        candidate = UPLOAD_DIR / payload.video_filename
        if candidate.exists():
            source_video_path = candidate
        else:
            # Query video record in database by title or filename
            video_rec = db.query(Video).filter(
                (Video.original_filename == payload.video_filename) |
                (Video.title == payload.video_filename) |
                (Video.storage_path.like(f"%{payload.video_filename}%"))
            ).order_by(Video.created_at.desc()).first()
            if video_rec:
                source_video_path = storage_service.get_file_path(video_rec.storage_path)

    # 3. Fallback: Check if there's any matching mp4 in UPLOAD_DIR
    if not source_video_path or not source_video_path.exists():
        mp4_files = list(UPLOAD_DIR.glob("*.mp4"))
        if mp4_files:
            source_video_path = sorted(mp4_files, key=lambda f: f.stat().st_mtime, reverse=True)[0]

    if not source_video_path or not source_video_path.exists():
        raise HTTPException(status_code=404, detail="Source video file could not be located on server.")

    # Resolve segments
    segments_to_burn = payload.segments
    if not segments_to_burn and job:
        subtitle = db.query(Subtitle).filter(
            Subtitle.job_id == job.id,
            Subtitle.track_type == (payload.track_type or "original")
        ).first()
        if subtitle:
            segments_to_burn = subtitle.segments

    if not segments_to_burn:
        raise HTTPException(status_code=400, detail="No subtitle segments provided to burn into video.")

    try:
        output_filename = f"burned_{uuid.uuid4().hex[:8]}.mp4"
        output_video_path = OUTPUT_DIR / output_filename

        burn_subtitles_to_video(
            video_path=source_video_path,
            segments=segments_to_burn,
            output_video_path=output_video_path,
            style_options=payload.style or {}
        )

        download_token = uuid.uuid4().hex
        if current_user:
            gen_file = GeneratedFile(
                user_id=current_user.id,
                job_id=job.id if job else None,
                file_type="burned_mp4",
                filename=output_filename,
                storage_path=f"burned/{output_filename}",
                storage_backend=storage_service.backend,
                file_size_bytes=output_video_path.stat().st_size if output_video_path.exists() else 0,
                download_token=download_token,
                expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            db.add(gen_file)
            db.commit()

        return {
            "message": "Video subtitles burned successfully",
            "download_url": f"/media/outputs/{output_filename}",
            "filename": output_filename,
            "status": "completed",
            "token": download_token
        }
    except SubtitleBurnError as e:
        logger.error(f"Burn failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected burn error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to burn video: {str(e)}")

@router.post("/{job_id}/burn-video")
def burn_job_video(
    job_id: str,
    payload: BurnVideoJobRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if current_user.role != "admin" and job.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    video = job.video
    if not video:
        raise HTTPException(status_code=404, detail="Video file not found")

    subtitle = db.query(Subtitle).filter(
        Subtitle.job_id == job_id,
        Subtitle.track_type == payload.track_type
    ).first()

    if not subtitle or not subtitle.segments:
        raise HTTPException(status_code=400, detail="No subtitles available to burn into video.")

    try:
        # Retrieve physical video file path
        source_video_path = storage_service.get_file_path(video.storage_path)
        output_filename = f"burned_{job_id}_{payload.track_type}_{uuid.uuid4().hex[:6]}.mp4"
        output_video_path = OUTPUT_DIR / output_filename

        # Burn with FFmpeg
        burn_subtitles_to_video(
            video_path=source_video_path,
            segments=subtitle.segments,
            output_video_path=output_video_path,
            style_options=payload.style or {}
        )

        # Save to storage service
        dest_key = f"burned/{output_filename}"
        stored_path = storage_service.save_file(output_video_path, dest_key)

        # Create GeneratedFile record with secure expiring token
        download_token = uuid.uuid4().hex
        gen_file = GeneratedFile(
            user_id=current_user.id,
            job_id=job.id,
            file_type="burned_mp4",
            filename=output_filename,
            storage_path=stored_path,
            storage_backend=storage_service.backend,
            file_size_bytes=output_video_path.stat().st_size if output_video_path.exists() else 0,
            download_token=download_token,
            expires_at=datetime.utcnow() + timedelta(hours=24)
        )
        db.add(gen_file)
        db.commit()

        # Generate download URL (presigned if S3, or secure endpoint)
        download_url = storage_service.generate_presigned_url(stored_path)
        if not download_url:
            download_url = f"/api/export/download/{download_token}"

        return {
            "message": "Video subtitles burned successfully",
            "download_url": download_url,
            "filename": output_filename,
            "token": download_token
        }

    except SubtitleBurnError as e:
        logger.error(f"Burn failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected burn error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to burn video: {str(e)}")

@router.get("/download/{token}")
def download_by_token(token: str, db: Session = Depends(get_db)):
    """Expiring token-based file download."""
    gen_file = db.query(GeneratedFile).filter(GeneratedFile.download_token == token).first()
    if not gen_file:
        raise HTTPException(status_code=404, detail="File download link invalid or expired")

    if gen_file.expires_at and datetime.utcnow() > gen_file.expires_at:
        raise HTTPException(status_code=410, detail="Download link has expired")

    file_path = storage_service.get_file_path(gen_file.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File no longer exists on storage")

    return FileResponse(
        path=str(file_path),
        filename=gen_file.filename,
        media_type="video/mp4"
    )

# Direct exports for immediate studio preview
@router.post("/srt")
def export_direct_srt(payload: DirectExportRequest):
    if not payload.segments:
        raise HTTPException(status_code=400, detail="No segments provided")
    srt_text = segments_to_srt(payload.segments)
    content = ("\ufeff" + srt_text).encode("utf-8")
    safe_name = f"{payload.filename.replace('.srt', '')}.srt"
    return Response(
        content=content,
        media_type="application/x-subrip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )

@router.post("/vtt")
def export_direct_vtt(payload: DirectExportRequest):
    if not payload.segments:
        raise HTTPException(status_code=400, detail="No segments provided")
    vtt_text = segments_to_vtt(payload.segments)
    safe_name = f"{payload.filename.replace('.vtt', '')}.vtt"
    return Response(
        content=vtt_text.encode("utf-8"),
        media_type="text/vtt",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )

@router.post("/json")
def export_direct_json(payload: DirectExportRequest):
    import json
    content = json.dumps({"subtitles": payload.segments}, indent=2, ensure_ascii=False).encode("utf-8")
    safe_name = f"{payload.filename.replace('.json', '')}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'}
    )
