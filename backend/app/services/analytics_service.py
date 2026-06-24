import uuid
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from app.analytics.metrics import compute_dashboard_kpis, compute_category_breakdown, compute_trends
from app.analytics.health_score import compute_health_score
from app.analytics.forecast import compute_forecast
from app.core.cache import cache_get, cache_set
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.budget import Budget


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def _load_df(self, user_id: uuid.UUID) -> pd.DataFrame:
        rows = (
            self.db.query(
                Transaction.txn_date,
                Transaction.amount,
                Transaction.direction,
                Category.name.label("category_name"),
            )
            .outerjoin(Category, Transaction.category_id == Category.id)
            .filter(Transaction.user_id == user_id)
            .all()
        )
        if not rows:
            return pd.DataFrame(columns=["txn_date", "amount", "direction", "category_name"])
        return pd.DataFrame(rows, columns=["txn_date", "amount", "direction", "category_name"])

    def dashboard(self, user_id: uuid.UUID, period: str) -> dict:
        cache_key = f"dashboard:{user_id}:{period}"
        cached = cache_get(cache_key)
        if cached:
            return cached
        df = self._load_df(user_id)
        result = compute_dashboard_kpis(df, period)
        cache_set(cache_key, result, ttl=300)
        return result

    def categories(self, user_id: uuid.UUID, period: str) -> dict:
        cache_key = f"categories:{user_id}:{period}"
        cached = cache_get(cache_key)
        if cached:
            return cached
        df = self._load_df(user_id)
        breakdown = compute_category_breakdown(df, period)
        result = {"period": period, "breakdown": breakdown}
        cache_set(cache_key, result, ttl=300)
        return result

    def trends(self, user_id: uuid.UUID, months: int) -> dict:
        cache_key = f"trends:{user_id}:{months}"
        cached = cache_get(cache_key)
        if cached:
            return cached
        df = self._load_df(user_id)
        result = compute_trends(df, months)
        cache_set(cache_key, result, ttl=300)
        return result

    def health_score(self, user_id: uuid.UUID, period: str) -> dict:
        df = self._load_df(user_id)
        kpis = compute_dashboard_kpis(df, period)
        savings_rate = float(kpis.get("savings_rate", 0))

        # Budget adherence
        budgets = self.db.query(Budget).filter(Budget.user_id == user_id, Budget.period == period).all()
        adherent = 0
        for b in budgets:
            spent_rows = [r for _, r in df[df["direction"] == "debit"].iterrows()
                          if str(r.get("category_id")) == str(b.category_id)]
            spent = sum(float(r["amount"]) for r in spent_rows)
            if spent <= float(b.monthly_limit):
                adherent += 1
        budget_adherence = adherent / len(budgets) if budgets else 0.5

        # Month-over-month expense growth
        trends = compute_trends(df, 3)
        series = trends.get("series", [])
        mom_growth = 0.0
        if len(series) >= 2:
            prev_exp = series[-2]["expenses"]
            curr_exp = series[-1]["expenses"]
            mom_growth = (curr_exp - prev_exp) / prev_exp if prev_exp > 0 else 0.0

        # Debt ratio (debt payments / income)
        income = float(kpis.get("income", 0))
        debt_rows = df[(df["direction"] == "debit") & (df["category_name"] == "Debt Payments")]
        debt = float(debt_rows["amount"].sum()) if not debt_rows.empty else 0.0
        debt_ratio = debt / income if income > 0 else 0.0

        return compute_health_score(savings_rate, budget_adherence, mom_growth, debt_ratio)

    def forecast(self, user_id: uuid.UUID, months_ahead: int) -> dict:
        df = self._load_df(user_id)
        from datetime import date
        today = date.today()
        if today.month == 12:
            target = f"{today.year + 1}-01"
        else:
            target = f"{today.year}-{today.month + months_ahead:02d}"
        return compute_forecast(df, target)
