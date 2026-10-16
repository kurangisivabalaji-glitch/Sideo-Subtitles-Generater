import os
import psutil
import shutil
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User
from app.models.video import Video
from app.models.job import TranscriptionJob
from app.models.audit import AuditLog
from app.schemas.auth import UserResponse, UserAdminUpdate
from app.schemas.job import JobResponse
from app.schemas.admin import PlatformMetrics, AdminAuditLogResponse
from app.core.deps import get_current_admin_user
from app.queue.job_queue import job_queue
from app.config import UPLOAD_DIR, OUTPUT_DIR, MAX_CONCURRENT_JOBS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["Admin Portal"])

@router.get("/metrics", response_model=PlatformMetrics)
def get_platform_metrics(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_videos = db.query(Video).count()
    total_jobs = db.query(TranscriptionJob).count()

    # Jobs by status
    status_counts = db.query(
        TranscriptionJob.status, func.count(TranscriptionJob.id)
    ).group_by(TranscriptionJob.status).all()
    jobs_by_status = {s: count for s, count in status_counts}
    for st in ("QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"):
        jobs_by_status.setdefault(st, 0)

    # Average latency for completed jobs
    completed_jobs = db.query(TranscriptionJob).filter(
        TranscriptionJob.status == "COMPLETED",
        TranscriptionJob.started_at.isnot(None),
        TranscriptionJob.completed_at.isnot(None)
    ).limit(50).all()

    total_latency = 0.0
    for j in completed_jobs:
        if j.completed_at and j.started_at:
            total_latency += (j.completed_at - j.started_at).total_seconds()
    avg_latency = round(total_latency / len(completed_jobs), 2) if completed_jobs else 0.0

    # Storage usage
    total_storage_bytes = 0
    for folder in (UPLOAD_DIR, OUTPUT_DIR):
        if folder.exists():
            for root, _, files in os.walk(folder):
                for f in files:
                    fp = os.path.join(root, f)
                    try:
                        total_storage_bytes += os.path.getsize(fp)
                    except Exception:
                        pass
    total_storage_mb = round(total_storage_bytes / (1024 * 1024), 2)

    # System resources (psutil)
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    system_resources = {
        "cpu_usage_pct": cpu_percent,
        "ram_total_gb": round(mem.total / (1024**3), 2),
        "ram_used_gb": round(mem.used / (1024**3), 2),
        "ram_percent": mem.percent,
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "disk_free_gb": round(disk.free / (1024**3), 2),
        "disk_percent": disk.percent
    }

    # Worker health
    active_count = len(job_queue.active_jobs)
    worker_health = {
        "status": "healthy",
        "active_workers": active_count,
        "max_concurrency": MAX_CONCURRENT_JOBS,
        "utilization_pct": round((active_count / MAX_CONCURRENT_JOBS) * 100, 1)
    }

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_videos": total_videos,
        "total_jobs": total_jobs,
        "jobs_by_status": jobs_by_status,
        "avg_latency_seconds": avg_latency,
        "total_storage_mb": total_storage_mb,
        "worker_health": worker_health,
        "system_resources": system_resources
    }

@router.get("/users")
def list_users_admin(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%") | User.full_name.ilike(f"%{search}%"))
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size, "users": users}

@router.put("/users/{user_id}")
def update_user_admin(
    user_id: str,
    payload: UserAdminUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None:
        user.role = payload.role
    if payload.tier is not None:
        user.tier = payload.tier
    if payload.max_duration_seconds is not None:
        user.max_duration_seconds = payload.max_duration_seconds

    # Audit log
    audit = AuditLog(
        admin_id=current_admin.id,
        target_user_id=user.id,
        action="user_updated_by_admin",
        details=payload.dict(exclude_unset=True)
    )
    db.add(audit)
    db.commit()
    db.refresh(user)
    return user

@router.get("/jobs")
def list_all_jobs_admin(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=100),
    status_filter: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    query = db.query(TranscriptionJob)
    if status_filter:
        query = query.filter(TranscriptionJob.status == status_filter.upper())
    total = query.count()
    jobs = query.order_by(TranscriptionJob.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {"total": total, "page": page, "size": size, "jobs": jobs}

@router.get("/audit-logs", response_model=List[AdminAuditLogResponse])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
