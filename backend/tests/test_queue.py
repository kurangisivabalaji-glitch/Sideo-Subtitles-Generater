import pytest
import uuid
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.video import Video
from app.models.job import TranscriptionJob
from app.queue.job_queue import ProductionJobQueue

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_job_queue_cancellation_and_recovery():
    db = SessionLocal()
    # Create test user & video
    user = User(
        email=f"worker_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hash",
        full_name="Worker Test",
        role="user"
    )
    db.add(user)
    db.flush()

    video = Video(
        user_id=user.id,
        title="Queue Test Video",
        original_filename="test.mp4",
        storage_path="uploads/test.mp4",
        storage_backend="local",
        duration=30.0,
        file_size_bytes=50000
    )
    db.add(video)
    db.flush()

    # Create job in PROCESSING state to simulate crash during execution
    job = TranscriptionJob(
        user_id=user.id,
        video_id=video.id,
        status="PROCESSING",
        stage="Processing interrupted by crash",
        progress=45,
        model_size="base",
        requested_language="en",
        retry_count=0
    )
    db.add(job)
    db.commit()
    job_id = job.id
    db.close()

    queue = ProductionJobQueue(max_workers=2)

    # 1. Test crash recovery: Should reset PROCESSING job to QUEUED and increment retry_count
    queue.recover_stale_jobs()

    db.close()

    # 2. Test user cancellation
    cancelled = queue.cancel_job(job_id)
    assert cancelled is True

    fresh_db = SessionLocal()
    cancelled_job = fresh_db.query(TranscriptionJob).filter(TranscriptionJob.id == job_id).first()
    assert cancelled_job.status == "CANCELLED"
    fresh_db.close()
