import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.models.subtitle import Subtitle
from app.schemas.subtitle import SubtitleResponse, SubtitleUpdate
from app.core.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subtitles", tags=["Subtitles"])

@router.get("/{subtitle_id}", response_model=SubtitleResponse)
def get_subtitle(
    subtitle_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    subtitle = db.query(Subtitle).filter(Subtitle.id == subtitle_id).first()
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    # Data isolation
    if current_user.role != "admin" and subtitle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this subtitle track")

    return subtitle

@router.put("/{subtitle_id}", response_model=SubtitleResponse)
def update_subtitle_segments(
    subtitle_id: str,
    payload: SubtitleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    subtitle = db.query(Subtitle).filter(Subtitle.id == subtitle_id).first()
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    # Data isolation
    if current_user.role != "admin" and subtitle.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to modify this subtitle track")

    subtitle.segments = payload.segments
    db.commit()
    db.refresh(subtitle)
    return subtitle
