from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from app.schemas.video import VideoResponse
from app.schemas.subtitle import SubtitleResponse

class JobResponse(BaseModel):
    id: str
    video_id: str
    status: str  # QUEUED, UPLOADING, PROCESSING, COMPLETED, FAILED, CANCELLED
    stage: str
    progress: int
    model_size: str
    requested_language: str
    target_language: Optional[str] = None
    detected_language: Optional[str] = None
    language_confidence: Optional[float] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    # Nested relations
    video: Optional[VideoResponse] = None
    subtitles: Optional[List[SubtitleResponse]] = []

    class Config:
        from_attributes = True

class JobListResponse(BaseModel):
    total: int
    page: int
    size: int
    jobs: List[JobResponse]
