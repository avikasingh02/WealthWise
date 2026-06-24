import hashlib
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.storage import put_object
from app.models.upload import UploadJob
from app.tasks.process_statement import process_statement


ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class UploadService:
    def __init__(self, db: Session):
        self.db = db

    def upload(self, user_id: uuid.UUID, file: UploadFile) -> dict:
        # Validate extension
        filename = file.filename or "upload"
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not supported. Use CSV or XLSX.")

        content = file.file.read()
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

        file_hash = hashlib.sha256(content).hexdigest()

        # Idempotency check
        existing = self.db.query(UploadJob).filter(
            UploadJob.user_id == user_id,
            UploadJob.file_hash == file_hash,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "DUPLICATE_FILE", "job_id": str(existing.id)},
            )

        job_id = uuid.uuid4()
        storage_key = f"users/{user_id}/uploads/{job_id}/{filename}"
        put_object(storage_key, content)

        job = UploadJob(
            id=job_id,
            user_id=user_id,
            file_hash=file_hash,
            storage_key=storage_key,
            status="PENDING",
        )
        self.db.add(job)
        self.db.commit()

        process_statement.delay(str(job_id))

        return {"job_id": str(job_id), "status": "PENDING"}

    def get_status(self, user_id: uuid.UUID, job_id: uuid.UUID) -> UploadJob:
        job = self.db.query(UploadJob).filter(
            UploadJob.id == job_id,
            UploadJob.user_id == user_id,
        ).first()
        if not job:
            raise HTTPException(status_code=404, detail="Upload job not found")
        return job
