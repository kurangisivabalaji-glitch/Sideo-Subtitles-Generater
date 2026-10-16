import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.config import UPLOAD_DIR, OUTPUT_DIR
from app.db.session import init_db
from app.queue.job_queue import job_queue
from app.core.rate_limiter import limiter

# Import all route modules
from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.jobs import router as jobs_router
from app.routes.subtitles import router as subtitles_router
from app.routes.translate import router as translate_router
from app.routes.export import router as export_router
from app.routes.admin import router as admin_router
from app.routes.ws import router as ws_router
from app.routes.transcribe import router as transcribe_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing database schemas and default administrator...")
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {e}")

    logger.info("Checking for stale jobs to recover from previous session...")
    try:
        job_queue.recover_stale_jobs()
    except Exception as e:
        logger.error(f"Job recovery error: {e}")

    yield

    # Shutdown sequence
    logger.info("Shutting down worker threads...")
    job_queue.executor.shutdown(wait=False, cancel_futures=True)

app = FastAPI(
    title="Universal AI Video Subtitle Generator — Multi-User Cloud Platform",
    version="2.0.0",
    description="Scalable cloud platform for AI video subtitle generation, multilingual translation, interactive studio editing, and video burn-in.",
    lifespan=lifespan
)

# Rate limiter setup
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS configuration (Fully compliant with modern browser credentialed requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[\w\.-]+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount media directories for video streaming and downloads
app.mount("/media/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/media/outputs", StaticFiles(directory=str(OUTPUT_DIR)), name="outputs")

# Include all API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(subtitles_router)
app.include_router(translate_router)
app.include_router(export_router)
app.include_router(admin_router)
app.include_router(ws_router)
app.include_router(transcribe_router)  # Provides /api/languages, /api/models, legacy fallback

@app.get("/")
async def root():
    return {
        "platform": "Universal AI Video Subtitle Generator Cloud Platform",
        "version": "2.0.0",
        "status": "online",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
