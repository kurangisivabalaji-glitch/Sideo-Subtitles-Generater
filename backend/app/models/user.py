import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # "user", "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    tier = Column(String(50), default="free", nullable=False)  # "free", "pro", "unlimited"
    
    # Quota tracking
    max_duration_seconds = Column(Integer, default=600)  # Free tier default 10 min
    monthly_transcribed_seconds = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    videos = relationship("Video", back_populates="owner", cascade="all, delete-orphan")
    jobs = relationship("TranscriptionJob", back_populates="user", cascade="all, delete-orphan")
    subtitles = relationship("Subtitle", back_populates="user", cascade="all, delete-orphan")
    generated_files = relationship("GeneratedFile", back_populates="user", cascade="all, delete-orphan")
    usage_records = relationship("UsageRecord", back_populates="user", cascade="all, delete-orphan")
