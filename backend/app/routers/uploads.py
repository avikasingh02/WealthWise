import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.upload import UploadAccepted, UploadJobOut
from app.services.upload_service import UploadService

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadAccepted, status_code=202)
def upload_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = UploadService(db).upload(current_user.id, file)
    return UploadAccepted(**result)


@router.get("/{job_id}", response_model=UploadJobOut)
def get_upload_status(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = UploadService(db).get_status(current_user.id, job_id)
    return UploadJobOut(
        job_id=job.id,
        status=job.status,
        rows_inserted=job.rows_inserted,
        error=job.error,
    )
