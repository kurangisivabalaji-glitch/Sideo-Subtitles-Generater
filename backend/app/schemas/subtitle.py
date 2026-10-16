from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class SubtitleSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str

class SubtitleResponse(BaseModel):
    id: str
    job_id: str
    track_type: str
    language_code: str
    language_name: Optional[str] = None
    segments: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubtitleUpdate(BaseModel):
    segments: List[Dict[str, Any]]
