import uuid
from decimal import Decimal
from pydantic import BaseModel


class CreateBudget(BaseModel):
    category_id: uuid.UUID
    monthly_limit: Decimal
    period: str  # YYYY-MM


class UpdateBudget(BaseModel):
    monthly_limit: Decimal


class BudgetOut(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str | None = None
    monthly_limit: Decimal
    period: str
    spent: Decimal = Decimal("0")
    pct_used: float = 0.0
    status: str = "OK"

    model_config = {"from_attributes": True}
