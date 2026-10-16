import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base

class Subtitle(Base):
    __tablename__ = "subtitles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    job_id = Column(String(36), ForeignKey("transcription_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    track_type = Column(String(50), default="original", nullable=False)  # "original", "translated"
    language_code = Column(String(50), nullable=False)
    language_name = Column(String(100), nullable=True)
    
    # Structured subtitle segments list: [{"id": 1, "start": 0.0, "end": 2.5, "text": "..."}]
    segments = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    job = relationship("TranscriptionJob", back_populates="subtitles")
    user = relationship("User", back_populates="subtitles")
