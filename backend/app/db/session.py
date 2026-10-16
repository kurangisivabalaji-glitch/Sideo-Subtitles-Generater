import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.config import DATABASE_URL
from app.db.base import Base

logger = logging.getLogger(__name__)

# Configure connect_args based on database type (SQLite vs PostgreSQL)
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300 if not DATABASE_URL.startswith("sqlite") else -1,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to register metadata
    from app.models import (
        user, video, job, subtitle, file, usage, audit
    )
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")

    # Safe migration: ensure target_language column exists in transcription_jobs
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE transcription_jobs ADD COLUMN target_language VARCHAR(50);"))
            conn.commit()
    except Exception:
        pass  # Column already exists

    # Auto seed initial admin user if none exists
    db = SessionLocal()
    try:
        from app.models.user import User
        from app.core.security import get_password_hash

        admin = db.query(User).filter(User.email == "admin@subtitlegenerator.com").first()
        if not admin:
            admin_user = User(
                email="admin@subtitlegenerator.com",
                hashed_password=get_password_hash("Admin123!Secure"),
                full_name="Platform Administrator",
                role="admin",
                is_active=True,
                tier="unlimited"
            )
            db.add(admin_user)
            db.commit()
            logger.info("Default administrator seeded: admin@subtitlegenerator.com / Admin123!Secure")
    except Exception as e:
        logger.warning(f"Admin seeding check failed: {e}")
        db.rollback()
    finally:
        db.close()
