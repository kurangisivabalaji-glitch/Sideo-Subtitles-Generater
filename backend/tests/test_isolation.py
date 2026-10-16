import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, init_db
from app.models.user import User
from app.models.video import Video
from app.models.job import TranscriptionJob
from app.models.subtitle import Subtitle

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def create_test_user(email: str, role: str = "user"):
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": email.split("@")[0]
    })
    token = res.json()["access_token"]
    user_id = res.json()["user"]["id"]

    if role == "admin":
        db = SessionLocal()
        u = db.query(User).filter(User.id == user_id).first()
        u.role = "admin"
        db.commit()
        db.close()

    return {"id": user_id, "token": token, "email": email}

def test_tenant_data_isolation():
    user_a = create_test_user(f"tenant_a_{uuid.uuid4().hex[:6]}@example.com")
    user_b = create_test_user(f"tenant_b_{uuid.uuid4().hex[:6]}@example.com")
    admin = create_test_user(f"admin_{uuid.uuid4().hex[:6]}@example.com", role="admin")

    # Manually create a Video, Job and Subtitle for User A
    db = SessionLocal()
    vid = Video(
        user_id=user_a["id"],
        title="User A Secret Project",
        original_filename="secret.mp4",
        storage_path="uploads/secret.mp4",
        storage_backend="local",
        duration=45.0,
        file_size_bytes=102400
    )
    db.add(vid)
    db.flush()

    job_a = TranscriptionJob(
        user_id=user_a["id"],
        video_id=vid.id,
        status="COMPLETED",
        stage="Completed",
        progress=100,
        model_size="base",
        requested_language="en",
        detected_language="en"
    )
    db.add(job_a)
    db.flush()

    sub_a = Subtitle(
        job_id=job_a.id,
        user_id=user_a["id"],
        track_type="original",
        language_code="en",
        language_name="English",
        segments=[{"id": 1, "start": 0.0, "end": 2.0, "text": "Confidential statement"}]
    )
    db.add(sub_a)
    db.commit()
    job_id = job_a.id
    sub_id = sub_a.id
    db.close()

    # 1. User A can view their own job
    res_a = client.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {user_a['token']}"})
    assert res_a.status_code == 200
    assert res_a.json()["id"] == job_id

    # 2. User B CANNOT view User A's job -> 404 (isolated)
    res_b = client.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {user_b['token']}"})
    assert res_b.status_code == 404

    # 3. User B list jobs does not contain User A's job
    res_b_list = client.get("/api/jobs", headers={"Authorization": f"Bearer {user_b['token']}"})
    assert res_b_list.status_code == 200
    b_job_ids = [j["id"] for j in res_b_list.json()["jobs"]]
    assert job_id not in b_job_ids

    # 4. User B CANNOT modify User A's subtitle track -> 403 Forbidden
    res_b_mod = client.put(f"/api/subtitles/{sub_id}", headers={"Authorization": f"Bearer {user_b['token']}"}, json={
        "segments": [{"id": 1, "start": 0.0, "end": 2.0, "text": "Hacked"}]
    })
    assert res_b_mod.status_code == 403

    # 5. User A CAN modify their own subtitle track -> 200 OK
    res_a_mod = client.put(f"/api/subtitles/{sub_id}", headers={"Authorization": f"Bearer {user_a['token']}"}, json={
        "segments": [{"id": 1, "start": 0.0, "end": 2.0, "text": "Updated by owner"}]
    })
    assert res_a_mod.status_code == 200
    assert res_a_mod.json()["segments"][0]["text"] == "Updated by owner"

    # 6. Admin can view User A's job
    res_admin = client.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {admin['token']}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["id"] == job_id
