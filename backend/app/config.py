import os
import shutil
from pathlib import Path
from typing import List

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
TEMP_DIR = BASE_DIR / "temp"

for directory in (UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR):
    directory.mkdir(parents=True, exist_ok=True)

# Find FFmpeg and FFprobe binaries
def _find_binary(name: str) -> str:
    found = shutil.which(name)
    if found:
        return found
    winget_dir = Path(r"C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin")
    if winget_dir.exists():
        candidate = winget_dir / f"{name}.exe"
        if candidate.exists():
            return str(candidate)
    return name

FFMPEG_BIN = _find_binary("ffmpeg")
FFPROBE_BIN = _find_binary("ffprobe")

# Ensure bin directory is added to os.environ["PATH"]
ffmpeg_parent = str(Path(FFMPEG_BIN).parent)
if ffmpeg_parent not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{ffmpeg_parent};{os.environ.get('PATH', '')}"

# Environment configuration
ENV = os.environ.get("ENV", "development")
SECRET_KEY = os.environ.get("SECRET_KEY", "super-secret-jwt-key-for-universal-subtitle-generator-production-change-me-123456789")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Database Configuration (PostgreSQL with SQLite local dev fallback)
DATABASE_URL = os.environ.get(
    "DATABASE_URL", 
    f"sqlite:///{BASE_DIR / 'subtitles_platform.db'}"
)
# Fix heroku/render postgres:// prefix to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Redis Configuration
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Storage Configuration ('local' or 's3')
STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local")
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", "")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "subtitle-generator-media")
S3_REGION = os.environ.get("S3_REGION", "us-east-1")

# Concurrency & Worker Limits
MAX_CONCURRENT_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "3"))
MAX_QUEUE_SIZE = int(os.environ.get("MAX_QUEUE_SIZE", "100"))
JOB_TIMEOUT_SECONDS = int(os.environ.get("JOB_TIMEOUT_SECONDS", "1800")) # 30 min max

# Whisper Settings (Default to tiny for ultra-fast 5-second transcription)
DEFAULT_WHISPER_MODEL = os.environ.get("DEFAULT_WHISPER_MODEL", "tiny")
SUPPORTED_WHISPER_MODELS = ["tiny", "base", "small", "medium", "large-v3"]
DEFAULT_DEVICE = os.environ.get("DEFAULT_DEVICE", "cpu")
DEFAULT_COMPUTE_TYPE = os.environ.get("DEFAULT_COMPUTE_TYPE", "int8")

# Upload Limits
MAX_UPLOAD_SIZE_MB = int(os.environ.get("MAX_UPLOAD_SIZE_MB", "500"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

SUPPORTED_EXTENSIONS = {
    ".mp4", ".mov", ".webm", ".avi", ".mkv", ".flv", ".m4v", ".wmv", ".ts", ".mpeg", ".3gp"
}

# Rate Limits (SlowAPI string syntax)
RATE_LIMIT_LOGIN = os.environ.get("RATE_LIMIT_LOGIN", "15/minute")
RATE_LIMIT_REGISTER = os.environ.get("RATE_LIMIT_REGISTER", "6/minute")
RATE_LIMIT_UPLOAD = os.environ.get("RATE_LIMIT_UPLOAD", "30/hour")
