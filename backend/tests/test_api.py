import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ffmpeg" in data
    assert data["engine"] == "faster-whisper"

def test_languages_endpoint():
    response = client.get("/api/languages")
    assert response.status_code == 200
    data = response.json()
    assert "languages" in data
    langs = {l["code"]: l["name"] for l in data["languages"]}
    # Check key languages are present
    assert "te" in langs  # Telugu
    assert "hi" in langs  # Hindi
    assert "ta" in langs  # Tamil
    assert "en" in langs  # English
    assert "ar" in langs  # Arabic

def test_models_endpoint():
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "models" in data
    model_ids = [m["id"] for m in data["models"]]
    assert "base" in model_ids
    assert "tiny" in model_ids
    assert "small" in model_ids

def test_export_srt_endpoint():
    payload = {
        "segments": [
            {"id": 1, "start": 0.0, "end": 2.5, "text": "నమస్కారం (Hello in Telugu)"}
        ],
        "filename": "my_subtitles"
    }
    response = client.post("/api/export/srt", json=payload)
    assert response.status_code == 200
    assert "attachment; filename=\"my_subtitles.srt\"" in response.headers["Content-Disposition"]
    assert "00:00:00,000 --> 00:00:02,500" in response.content.decode("utf-8")
    assert "నమస్కారం" in response.content.decode("utf-8")

def test_export_vtt_endpoint():
    payload = {
        "segments": [
            {"id": 1, "start": 1.2, "end": 3.4, "text": "Test VTT line"}
        ]
    }
    response = client.post("/api/export/vtt", json=payload)
    assert response.status_code == 200
    assert "WEBVTT" in response.text
    assert "00:00:01.200 --> 00:00:03.400" in response.text

def test_export_json_endpoint():
    payload = {
        "segments": [
            {"id": 1, "start": 1.0, "end": 2.0, "text": "Json test"}
        ]
    }
    response = client.post("/api/export/json", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "subtitles" in data
    assert len(data["subtitles"]) == 1

def test_convert_subtitles_endpoint():
    srt_content = "1\n00:00:01,000 --> 00:00:03,000\nHello world\n"
    payload = {
        "content": srt_content,
        "file_format": "srt",
        "target_language": "es"
    }
    response = client.post("/api/translate/convert-subtitles", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_language"] == "es"
    assert "srt" in data
    assert "vtt" in data
    assert len(data["segments"]) == 1

def test_burn_video_endpoint():
    payload = {
        "video_filename": "sample_test.mp4",
        "segments": [
            {"id": 1, "start": 0.0, "end": 1.0, "text": "Burned line"}
        ],
        "style": {"fontFamily": "Arial", "fontSize": 20}
    }
    response = client.post("/api/export/burn-video", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert "download_url" in data

