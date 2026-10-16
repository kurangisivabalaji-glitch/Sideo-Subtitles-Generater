import time
import uuid
import threading
from typing import Dict, Any, Optional

class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_job(self, metadata: Optional[Dict[str, Any]] = None) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "status": "pending",  # pending, processing, completed, failed
                "progress": 0,
                "step": "Initializing job...",
                "error": None,
                "result": None,
                "created_at": time.time(),
                "updated_at": time.time(),
                "metadata": metadata or {}
            }
        return job_id

    def update_job(
        self,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        step: Optional[str] = None,
        error: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None
    ) -> None:
        with self._lock:
            if job_id in self._jobs:
                job = self._jobs[job_id]
                if status is not None:
                    job["status"] = status
                if progress is not None:
                    job["progress"] = max(0, min(100, progress))
                if step is not None:
                    job["step"] = step
                if error is not None:
                    job["error"] = error
                if result is not None:
                    job["result"] = result
                job["updated_at"] = time.time()

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            if job:
                return dict(job)
            return None

    def cleanup_old_jobs(self, max_age_seconds: int = 7200) -> None:
        """Removes jobs older than 2 hours to avoid memory leak."""
        now = time.time()
        with self._lock:
            to_delete = [
                jid for jid, j in self._jobs.items()
                if (now - j.get("created_at", 0)) > max_age_seconds
            ]
            for jid in to_delete:
                del self._jobs[jid]

# Global singleton
job_manager = JobManager()
