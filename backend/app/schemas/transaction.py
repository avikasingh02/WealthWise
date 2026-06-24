import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class TransactionOut(BaseModel):
    id: uuid.UUID
    txn_date: date
    amount: Decimal
    direction: str
    merchant_norm: str | None
    description: str | None
    category_id: uuid.UUID | None
    category_name: str | None = None

    model_config = {"from_attributes": True}


class TransactionPage(BaseModel):
    items: list[TransactionOut]
    total: int
    limit: int
    offset: int


class PatchTransaction(BaseModel):
    category_id: uuid.UUID
