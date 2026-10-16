import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db
from app.models.job import TranscriptionJob
from app.models.user import User
from app.core.security import decode_token
from app.queue.job_queue import register_job_listener, unregister_job_listener

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Real-time Updates"])

@router.websocket("/api/ws/jobs/{job_id}")
async def websocket_job_progress(
    websocket: WebSocket,
    job_id: str,
    token: str = Query(...)
):
    await websocket.accept()

    # 1. Authenticate token
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4001, reason="Unauthorized")
        return

    user_id = payload.get("sub")
    role = payload.get("role", "user")

    # 2. Check Job Ownership
    db = SessionLocal()
    try:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
        if not job:
            await websocket.close(code=4004, reason="Job not found")
            return
        if role != "admin" and job.user_id != user_id:
            await websocket.close(code=4003, reason="Access denied to this job")
            return

        # Send initial snapshot
        await websocket.send_text(json.dumps({
            "job_id": job.id,
            "status": job.status,
            "stage": job.stage,
            "progress": job.progress,
            "detected_language": job.detected_language,
            "confidence": job.language_confidence,
            "error": job.error_message
        }))
    finally:
        db.close()

    # 3. Setup event queue and register listener
    event_queue = asyncio.Queue()
    loop = asyncio.get_event_loop()

    def on_event(event_data):
        loop.call_soon_threadsafe(event_queue.put_nowait, event_data)

    register_job_listener(job_id, on_event)

    try:
        while True:
            # Wait for background queue events or client pings
            event = await event_queue.get()
            await websocket.send_text(json.dumps(event))
            if event.get("status") in ("COMPLETED", "FAILED", "CANCELLED"):
                break
    except WebSocketDisconnect:
        logger.debug(f"Client disconnected from WebSocket for job {job_id}")
    except Exception as e:
        logger.debug(f"WebSocket error for job {job_id}: {e}")
    finally:
        unregister_job_listener(job_id, on_event)

@router.get("/api/jobs/{job_id}/events")
async def sse_job_progress(job_id: str, token: str = Query(...)):
    """Server-Sent Events (SSE) alternative for firewalled networks."""
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    role = payload.get("role", "user")

    db = SessionLocal()
    try:
        job = db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
        if not job or (role != "admin" and job.user_id != user_id):
            raise HTTPException(status_code=404, detail="Job not found or unauthorized")
    finally:
        db.close()

    async def event_generator():
        event_queue = asyncio.Queue()
        loop = asyncio.get_event_loop()

        def on_event(data):
            loop.call_soon_threadsafe(event_queue.put_nowait, data)

        register_job_listener(job_id, on_event)
        try:
            while True:
                data = await event_queue.get()
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("status") in ("COMPLETED", "FAILED", "CANCELLED"):
                    break
        finally:
            unregister_job_listener(job_id, on_event)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
