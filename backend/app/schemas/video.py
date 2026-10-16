from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class VideoResponse(BaseModel):
    id: str
    title: str
    original_filename: str
    duration: float
    file_size_bytes: int
    width: int
    height: int
    has_audio: bool
    created_at: datetime

    class Config:
        from_attributes = True
