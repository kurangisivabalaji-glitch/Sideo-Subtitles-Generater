import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.job import TranscriptionJob
from app.models.subtitle import Subtitle
from app.core.deps import get_current_active_user, get_optional_current_user
from app.services.translator_service import translate_segments, TRANSLATION_LANGUAGES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/translate", tags=["Translation"])

class TranslateRequest(BaseModel):
    segments: List[Dict[str, Any]]
    target_language: str
    source_language: Optional[str] = "auto"
    job_id: Optional[str] = None

@router.post("")
def translate_subtitles_endpoint(
    request: TranslateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if not request.segments:
        raise HTTPException(status_code=400, detail="No subtitle segments provided to translate.")
    
    if not request.target_language:
        raise HTTPException(status_code=400, detail="Target language must be specified.")

    job = None
    if request.job_id:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.id == request.job_id).first()
        if job and current_user and current_user.role != "admin" and job.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this job")

    try:
        result = translate_segments(
            segments=request.segments,
            target_language=request.target_language,
            source_language=request.source_language
        )

        # If job_id was provided, save/update translated Subtitle track in DB
        if request.job_id and job:
            target_user_id = current_user.id if current_user else job.user_id
            existing_sub = db.query(Subtitle).filter(
                Subtitle.job_id == request.job_id,
                Subtitle.track_type == "translated",
                Subtitle.language_code == result["target_language"]
            ).first()

            if existing_sub:
                existing_sub.segments = result["segments"]
            else:
                new_sub = Subtitle(
                    job_id=request.job_id,
                    user_id=target_user_id,
                    track_type="translated",
                    language_code=result["target_language"],
                    language_name=result.get("target_language_name"),
                    segments=result["segments"]
                )
                db.add(new_sub)
            db.commit()

        return result
    except Exception as e:
        logger.exception(f"Translation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

class BatchTranslateRequest(BaseModel):
    segments: List[Dict[str, Any]]
    target_languages: List[str]
    source_language: Optional[str] = "auto"
    job_id: Optional[str] = None

@router.post("/batch")
def batch_translate_subtitles_endpoint(
    request: BatchTranslateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    if not request.segments:
        raise HTTPException(status_code=400, detail="No subtitle segments provided.")
    if not request.target_languages:
        raise HTTPException(status_code=400, detail="At least one target language must be specified.")

    job = None
    if request.job_id:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.id == request.job_id).first()
        if job and current_user and current_user.role != "admin" and job.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this job")

    translations = {}
    for tgt in request.target_languages:
        clean_tgt = tgt.strip().lower()
        if not clean_tgt or clean_tgt == "auto":
            continue
        try:
            res = translate_segments(
                segments=request.segments,
                target_language=clean_tgt,
                source_language=request.source_language
            )
            translations[res["target_language"]] = res

            if request.job_id and job:
                target_user_id = current_user.id if current_user else job.user_id
                existing = db.query(Subtitle).filter(
                    Subtitle.job_id == request.job_id,
                    Subtitle.track_type == "translated",
                    Subtitle.language_code == res["target_language"]
                ).first()
                if existing:
                    existing.segments = res["segments"]
                else:
                    new_sub = Subtitle(
                        job_id=request.job_id,
                        user_id=target_user_id,
                        track_type="translated",
                        language_code=res["target_language"],
                        language_name=res.get("target_language_name"),
                        segments=res["segments"]
                    )
                    db.add(new_sub)
        except Exception as err:
            logger.warning(f"Batch translation to {clean_tgt} encountered error: {err}")

    if request.job_id:
        db.commit()

    return {"translations": translations}

class ConvertSubtitleRequest(BaseModel):
    content: str
    file_format: Optional[str] = "srt"  # srt or vtt
    target_language: str
    source_language: Optional[str] = "auto"

@router.post("/convert-subtitles")
def convert_subtitles_file_endpoint(
    request: ConvertSubtitleRequest,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    from app.services.subtitle_service import parse_srt, parse_vtt, segments_to_srt, segments_to_vtt

    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="Subtitle content is empty.")
    if not request.target_language:
        raise HTTPException(status_code=400, detail="Target language must be specified.")

    fmt = (request.file_format or "srt").lower()
    if fmt == "vtt":
        segments = parse_vtt(request.content)
    else:
        segments = parse_srt(request.content)

    if not segments:
        raise HTTPException(status_code=400, detail="Could not parse any valid subtitle timestamps and text from the provided content.")

    try:
        res = translate_segments(
            segments=segments,
            target_language=request.target_language,
            source_language=request.source_language
        )
        translated_segments = res.get("segments", [])
        return {
            "target_language": res["target_language"],
            "target_language_name": res.get("target_language_name"),
            "is_rtl": res.get("is_rtl", False),
            "segments": translated_segments,
            "srt": segments_to_srt(translated_segments),
            "vtt": segments_to_vtt(translated_segments)
        }
    except Exception as e:
        logger.exception(f"Subtitle conversion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Subtitle conversion failed: {str(e)}")

@router.get("/languages")
def get_translation_languages():
    return {"languages": TRANSLATION_LANGUAGES}

