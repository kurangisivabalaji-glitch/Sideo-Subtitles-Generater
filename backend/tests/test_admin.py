import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, init_db
from app.models.user import User

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def create_user(role="user"):
    email = f"adm_test_{uuid.uuid4().hex[:6]}@example.com"
    res = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Admin Tester"
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

def test_admin_metrics_access_control():
    regular_user = create_user(role="user")
    admin_user = create_user(role="admin")

    # Regular user -> 403 Forbidden
    res_reg = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {regular_user['token']}"})
    assert res_reg.status_code == 403

    # Admin user -> 200 OK with full platform telemetry
    res_admin = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {admin_user['token']}"})
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "total_users" in data
    assert "system_resources" in data
    assert "cpu_usage_pct" in data["system_resources"]
    assert "ram_percent" in data["system_resources"]
    assert "worker_health" in data
    assert data["worker_health"]["status"] == "healthy"

def test_admin_user_management():
    admin = create_user(role="admin")
    target = create_user(role="user")

    # Admin lists users
    list_res = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin['token']}"})
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 2

    # Admin updates user tier to 'pro'
    upd_res = client.put(f"/api/admin/users/{target['id']}", headers={"Authorization": f"Bearer {admin['token']}"}, json={
        "tier": "pro",
        "max_duration_seconds": 3600
    })
    assert upd_res.status_code == 200
    assert upd_res.json()["tier"] == "pro"
    assert upd_res.json()["max_duration_seconds"] == 3600
