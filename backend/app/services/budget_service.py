import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.category import Category
from app.models.transaction import Transaction
from app.schemas.budget import CreateBudget, UpdateBudget


class BudgetService:
    def __init__(self, db: Session):
        self.db = db

    def list_budgets(self, user_id: uuid.UUID, period: str) -> list[dict]:
        budgets = self.db.query(Budget).filter(Budget.user_id == user_id, Budget.period == period).all()
        result = []
        for b in budgets:
            cat_name = b.category.name if b.category else None
            spent_rows = (
                self.db.query(Transaction)
                .filter(
                    Transaction.user_id == user_id,
                    Transaction.category_id == b.category_id,
                    Transaction.direction == "debit",
                )
                .all()
            )
            spent = Decimal(sum(float(t.amount) for t in spent_rows
                               if t.txn_date.strftime("%Y-%m") == period))
            pct = float(spent / b.monthly_limit) if b.monthly_limit > 0 else 0.0
            status = "OK" if pct < 0.8 else "WARN" if pct <= 1.0 else "OVER"
            result.append({
                "id": b.id,
                "category_id": b.category_id,
                "category_name": cat_name,
                "monthly_limit": b.monthly_limit,
                "period": b.period,
                "spent": spent,
                "pct_used": round(pct, 4),
                "status": status,
            })
        return result

    def create(self, user_id: uuid.UUID, req: CreateBudget) -> Budget:
        existing = self.db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.category_id == req.category_id,
            Budget.period == req.period,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail="Budget for this category and period already exists")
        b = Budget(user_id=user_id, **req.model_dump())
        self.db.add(b)
        self.db.commit()
        self.db.refresh(b)
        return b

    def update(self, user_id: uuid.UUID, budget_id: uuid.UUID, req: UpdateBudget) -> Budget:
        b = self._get_or_404(user_id, budget_id)
        b.monthly_limit = req.monthly_limit
        self.db.commit()
        self.db.refresh(b)
        return b

    def delete(self, user_id: uuid.UUID, budget_id: uuid.UUID) -> None:
        b = self._get_or_404(user_id, budget_id)
        self.db.delete(b)
        self.db.commit()

    def _get_or_404(self, user_id: uuid.UUID, budget_id: uuid.UUID) -> Budget:
        b = self.db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id).first()
        if not b:
            raise HTTPException(status_code=404, detail="Budget not found")
        return b
