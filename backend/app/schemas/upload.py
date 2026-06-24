import uuid
from datetime import datetime
from pydantic import BaseModel


class UploadJobOut(BaseModel):
    job_id: uuid.UUID
    status: str
    rows_inserted: int = 0
    error: str | None = None

    model_config = {"from_attributes": True}


class UploadAccepted(BaseModel):
    job_id: uuid.UUID
    status: str = "PENDING"
