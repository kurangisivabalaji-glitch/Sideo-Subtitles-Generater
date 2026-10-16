import os
import shutil
import logging
from pathlib import Path
from typing import Optional
from app.config import (
    STORAGE_BACKEND,
    S3_ENDPOINT_URL,
    S3_ACCESS_KEY,
    S3_SECRET_KEY,
    S3_BUCKET_NAME,
    S3_REGION,
    UPLOAD_DIR,
    OUTPUT_DIR
)

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.backend = STORAGE_BACKEND.lower()
        self.s3_client = None

        if self.backend == "s3" and S3_ACCESS_KEY and S3_SECRET_KEY:
            try:
                import boto3
                kwargs = {
                    "region_name": S3_REGION,
                    "aws_access_key_id": S3_ACCESS_KEY,
                    "aws_secret_access_key": S3_SECRET_KEY,
                }
                if S3_ENDPOINT_URL:
                    kwargs["endpoint_url"] = S3_ENDPOINT_URL
                self.s3_client = boto3.client("s3", **kwargs)
                logger.info(f"Connected to S3 storage bucket: {S3_BUCKET_NAME}")
            except Exception as e:
                logger.warning(f"Failed to connect to S3, falling back to local: {e}")
                self.backend = "local"
        else:
            self.backend = "local"

    def save_file(self, local_source_path: Path, destination_key: str) -> str:
        """
        Saves a local file to storage.
        Returns the persistent storage identifier / relative path.
        """
        if self.backend == "s3" and self.s3_client:
            self.s3_client.upload_file(str(local_source_path), S3_BUCKET_NAME, destination_key)
            return f"s3://{S3_BUCKET_NAME}/{destination_key}"
        else:
            # Store in local UPLOAD_DIR or OUTPUT_DIR
            dest_path = UPLOAD_DIR / destination_key
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            if local_source_path != dest_path:
                shutil.copy2(str(local_source_path), str(dest_path))
            return str(destination_key)

    def get_file_path(self, storage_path: str, temp_target: Optional[Path] = None) -> Path:
        """
        Retrieves the physical local path for processing (downloads from S3 if necessary).
        """
        if storage_path.startswith("s3://") and self.s3_client:
            parts = storage_path.replace("s3://", "").split("/", 1)
            bucket = parts[0]
            key = parts[1]
            target = temp_target or (UPLOAD_DIR / key)
            target.parent.mkdir(parents=True, exist_ok=True)
            self.s3_client.download_file(bucket, key, str(target))
            return target
        else:
            # Local path
            candidate = UPLOAD_DIR / storage_path
            if candidate.exists():
                return candidate
            candidate_out = OUTPUT_DIR / storage_path
            if candidate_out.exists():
                return candidate_out
            return Path(storage_path)

    def generate_presigned_url(self, storage_path: str, expires_in: int = 900) -> str:
        """
        Generates a short-lived presigned download URL (15 min default).
        """
        if storage_path.startswith("s3://") and self.s3_client:
            parts = storage_path.replace("s3://", "").split("/", 1)
            bucket = parts[0]
            key = parts[1]
            try:
                url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=expires_in
                )
                return url
            except Exception as e:
                logger.error(f"Failed to generate S3 presigned URL: {e}")
                return ""
        else:
            # Local route with secure token
            clean_path = storage_path.replace("\\", "/").lstrip("/")
            return f"/api/media/secure-download?path={clean_path}"

    def delete_file(self, storage_path: str) -> bool:
        if storage_path.startswith("s3://") and self.s3_client:
            parts = storage_path.replace("s3://", "").split("/", 1)
            bucket = parts[0]
            key = parts[1]
            try:
                self.s3_client.delete_object(Bucket=bucket, Key=key)
                return True
            except Exception as e:
                logger.error(f"Failed to delete S3 object: {e}")
                return False
        else:
            target = UPLOAD_DIR / storage_path
            if target.exists():
                target.unlink(missing_ok=True)
                return True
            return False

# Global storage instance
storage_service = StorageService()
