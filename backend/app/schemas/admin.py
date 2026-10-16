from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

class PlatformMetrics(BaseModel):
    total_users: int
    active_users: int
    total_videos: int
    total_jobs: int
    jobs_by_status: Dict[str, int]
    avg_latency_seconds: float
    total_storage_mb: float
    worker_health: Dict[str, Any]
    system_resources: Dict[str, Any]

class AdminAuditLogResponse(BaseModel):
    id: str
    admin_id: Optional[str]
    target_user_id: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[Dict[str, Any]]
    created_at: datetime

    class Config:
        from_attributes = True
