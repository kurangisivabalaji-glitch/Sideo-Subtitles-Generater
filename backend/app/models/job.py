import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Statuses: QUEUED, UPLOADING, PROCESSING, COMPLETED, FAILED, CANCELLED
    status = Column(String(50), default="QUEUED", nullable=False, index=True)
    stage = Column(String(255), default="Initializing job...", nullable=False)
    progress = Column(Integer, default=0, nullable=False)  # 0 to 100
    
    model_size = Column(String(50), default="base", nullable=False)
    requested_language = Column(String(50), default="auto", nullable=False)
    target_language = Column(String(50), nullable=True)
    detected_language = Column(String(50), nullable=True)
    language_confidence = Column(Float, nullable=True)
    
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    idempotency_key = Column(String(255), unique=True, nullable=True, index=True)
    
    # Performance tracking
    queued_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="jobs")
    video = relationship("Video", back_populates="jobs")
    subtitles = relationship("Subtitle", back_populates="job", cascade="all, delete-orphan")
    generated_files = relationship("GeneratedFile", back_populates="job", cascade="all, delete-orphan")
