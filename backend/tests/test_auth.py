import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()

def test_register_and_login_flow():
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    password = "TestPassword123!"

    # 1. Register new user
    reg_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password,
        "full_name": "Test Runner"
    })
    assert reg_res.status_code == 200, reg_res.text
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert reg_data["user"]["tier"] == "free"

    token = reg_data["access_token"]

    # 2. Duplicate registration rejected
    dup_res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password,
        "full_name": "Duplicate"
    })
    assert dup_res.status_code == 400

    # 3. Login with wrong password
    bad_login = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401

    # 4. Login with correct password
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": password
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 5. Access profile with token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 6. Access profile without token -> 401
    unauth_res = client.get("/api/auth/me")
    assert unauth_res.status_code == 401

def test_change_password():
    unique_email = f"pwd_{uuid.uuid4().hex[:8]}@example.com"
    old_pwd = "OldPassword123!"
    new_pwd = "NewPassword456!"

    reg = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": old_pwd,
        "full_name": "Password Tester"
    })
    token = reg.json()["access_token"]

    # Change password
    chg_res = client.post("/api/auth/change-password", headers={"Authorization": f"Bearer {token}"}, json={
        "current_password": old_pwd,
        "new_password": new_pwd
    })
    assert chg_res.status_code == 200

    # Verify old password no longer works
    fail_login = client.post("/api/auth/login", json={"email": unique_email, "password": old_pwd})
    assert fail_login.status_code == 401

    # Verify new password works
    ok_login = client.post("/api/auth/login", json={"email": unique_email, "password": new_pwd})
    assert ok_login.status_code == 200
