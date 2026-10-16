from fastapi import APIRouter
from app.config import FFMPEG_BIN, FFPROBE_BIN, DEFAULT_WHISPER_MODEL

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "ffmpeg": FFMPEG_BIN,
        "ffprobe": FFPROBE_BIN,
        "whisper_default_model": DEFAULT_WHISPER_MODEL,
        "engine": "faster-whisper",
        "translation_engine": "deep-translator"
    }
