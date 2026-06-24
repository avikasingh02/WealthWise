import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.transaction import TransactionPage, TransactionOut, PatchTransaction

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=TransactionPage)
def list_transactions(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    category: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if from_date:
        q = q.filter(Transaction.txn_date >= from_date)
    if to_date:
        q = q.filter(Transaction.txn_date <= to_date)
    if category:
        cat = db.query(Category).filter(Category.name == category).first()
        if cat:
            q = q.filter(Transaction.category_id == cat.id)

    total = q.count()
    txns = q.order_by(Transaction.txn_date.desc()).offset(offset).limit(limit).all()

    items = []
    for t in txns:
        items.append(TransactionOut(
            id=t.id,
            txn_date=t.txn_date,
            amount=t.amount,
            direction=t.direction,
            merchant_norm=t.merchant_norm,
            description=t.description,
            category_id=t.category_id,
            category_name=t.category.name if t.category else None,
        ))
    return TransactionPage(items=items, total=total, limit=limit, offset=offset)


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(
    txn_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException
    t = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == current_user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return TransactionOut(
        id=t.id, txn_date=t.txn_date, amount=t.amount, direction=t.direction,
        merchant_norm=t.merchant_norm, description=t.description,
        category_id=t.category_id, category_name=t.category.name if t.category else None,
    )


@router.patch("/{txn_id}", response_model=TransactionOut)
def patch_transaction(
    txn_id: uuid.UUID,
    body: PatchTransaction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException
    from app.core.cache import cache_delete_pattern
    t = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == current_user.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    t.category_id = body.category_id
    db.commit()
    db.refresh(t)
    cache_delete_pattern(f"dashboard:{current_user.id}:*")
    cache_delete_pattern(f"categories:{current_user.id}:*")
    return TransactionOut(
        id=t.id, txn_date=t.txn_date, amount=t.amount, direction=t.direction,
        merchant_norm=t.merchant_norm, description=t.description,
        category_id=t.category_id, category_name=t.category.name if t.category else None,
    )
