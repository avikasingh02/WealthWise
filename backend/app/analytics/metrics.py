"""Pure analytics functions — take DataFrames, return dicts. No DB/HTTP."""
from decimal import Decimal
from typing import Any

import numpy as np
import pandas as pd


def compute_dashboard_kpis(df: pd.DataFrame, period: str) -> dict[str, Any]:
    """df columns: txn_date, amount (float), direction (debit/credit), category_name."""
    if df.empty:
        return {"income": 0, "expenses": 0, "savings": 0, "savings_rate": 0.0, "top_category": None, "txn_count": 0}

    df = df.copy()
    df["txn_date"] = pd.to_datetime(df["txn_date"])
    mask = df["txn_date"].dt.strftime("%Y-%m") == period if period else pd.Series([True] * len(df))
    df = df[mask]

    income = float(df[df["direction"] == "credit"]["amount"].sum())
    expenses = float(df[df["direction"] == "debit"]["amount"].sum())
    savings = income - expenses
    savings_rate = round(savings / income, 4) if income > 0 else 0.0

    debits = df[df["direction"] == "debit"]
    top_category = None
    if not debits.empty and "category_name" in debits.columns:
        top_category = debits.groupby("category_name")["amount"].sum().idxmax()

    return {
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "savings": round(savings, 2),
        "savings_rate": savings_rate,
        "top_category": top_category,
        "txn_count": int(len(df)),
    }


def compute_category_breakdown(df: pd.DataFrame, period: str) -> list[dict]:
    if df.empty:
        return []
    df = df.copy()
    df["txn_date"] = pd.to_datetime(df["txn_date"])
    df = df[(df["txn_date"].dt.strftime("%Y-%m") == period) & (df["direction"] == "debit")]
    if df.empty:
        return []

    total = df["amount"].sum()
    grouped = df.groupby("category_name")["amount"].sum().sort_values(ascending=False)
    return [
        {"category": cat, "amount": round(float(amt), 2), "pct": round(float(amt / total), 4)}
        for cat, amt in grouped.items()
    ]


def compute_trends(df: pd.DataFrame, months: int = 6) -> dict[str, Any]:
    if df.empty:
        return {"series": [], "rolling_avg_3m": [], "fastest_growing_category": None}

    df = df.copy()
    df["txn_date"] = pd.to_datetime(df["txn_date"])
    df["month"] = df["txn_date"].dt.strftime("%Y-%m")

    monthly = df.groupby(["month", "direction"])["amount"].sum().unstack(fill_value=0)
    monthly = monthly.tail(months).reset_index()
    monthly.columns.name = None

    series = []
    for _, row in monthly.iterrows():
        series.append({
            "month": row["month"],
            "expenses": round(float(row.get("debit", 0)), 2),
            "income": round(float(row.get("credit", 0)), 2),
        })

    # Rolling 3m average on expenses
    expense_vals = [s["expenses"] for s in series]
    rolling = []
    for i, s in enumerate(series):
        window = expense_vals[max(0, i - 2): i + 1]
        rolling.append({"month": s["month"], "expenses": round(float(np.mean(window)), 2), "income": s["income"]})

    # Fastest growing category (MoM delta)
    fastest = None
    if not df.empty and len(series) >= 2:
        debits = df[df["direction"] == "debit"]
        cat_monthly = debits.groupby(["month", "category_name"])["amount"].sum().unstack(fill_value=0)
        if len(cat_monthly) >= 2:
            delta = cat_monthly.iloc[-1] - cat_monthly.iloc[-2]
            fastest = delta.idxmax() if not delta.empty else None

    return {"series": series, "rolling_avg_3m": rolling, "fastest_growing_category": fastest}
