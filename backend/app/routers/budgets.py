import uuid
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.budget import CreateBudget, UpdateBudget, BudgetOut
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("", response_model=list[BudgetOut])
def list_budgets(
    period: str = Query(default=date.today().strftime("%Y-%m")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return BudgetService(db).list_budgets(current_user.id, period)


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(
    req: CreateBudget,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = BudgetService(db).create(current_user.id, req)
    return BudgetOut(id=b.id, category_id=b.category_id, monthly_limit=b.monthly_limit, period=b.period)


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: uuid.UUID,
    req: UpdateBudget,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = BudgetService(db).update(current_user.id, budget_id, req)
    return BudgetOut(id=b.id, category_id=b.category_id, monthly_limit=b.monthly_limit, period=b.period)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    BudgetService(db).delete(current_user.id, budget_id)
