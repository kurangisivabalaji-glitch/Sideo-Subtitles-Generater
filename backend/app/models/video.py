import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    storage_backend = Column(String(50), default="local", nullable=False)  # "local", "s3"
    
    # Metadata
    duration = Column(Float, default=0.0)
    file_size_bytes = Column(Integer, default=0)
    width = Column(Integer, default=1920)
    height = Column(Integer, default=1080)
    video_codec = Column(String(50), nullable=True)
    audio_codec = Column(String(50), nullable=True)
    has_audio = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="videos")
    jobs = relationship("TranscriptionJob", back_populates="video", cascade="all, delete-orphan")
