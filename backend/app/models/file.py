import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class GeneratedFile(Base):
    __tablename__ = "generated_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(String(36), ForeignKey("transcription_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    file_type = Column(String(50), nullable=False)  # "srt", "vtt", "json", "burned_mp4"
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    storage_backend = Column(String(50), default="local", nullable=False)
    file_size_bytes = Column(Integer, default=0)
    
    download_token = Column(String(128), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="generated_files")
    job = relationship("TranscriptionJob", back_populates="generated_files")
