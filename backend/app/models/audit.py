import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON
from app.db.base import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    admin_id = Column(String(36), nullable=True, index=True)
    target_user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # "user_suspended", "job_retried", "quota_changed", etc.
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
