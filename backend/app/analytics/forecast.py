"""Spending forecast — moving average (baseline) and linear regression (trend)."""
from typing import Any

import numpy as np
import pandas as pd


def _moving_average(values: list[float], window: int = 3) -> float:
    if not values:
        return 0.0
    return float(np.mean(values[-window:]))


def _linear_regression_forecast(values: list[float]) -> tuple[float, float]:
    """Returns (predicted_next, r_squared)."""
    if len(values) < 2:
        return _moving_average(values), 0.0
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    coeffs = np.polyfit(x, y, 1)
    predicted = float(np.polyval(coeffs, len(values)))
    predicted = max(0.0, predicted)
    ss_res = np.sum((y - np.polyval(coeffs, x)) ** 2)
    ss_tot = np.sum((y - y.mean()) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return predicted, float(r2)


def compute_forecast(df: pd.DataFrame, target_month: str) -> dict[str, Any]:
    """
    df columns: txn_date (date/str), amount (float), direction, category_name.
    target_month: 'YYYY-MM'
    """
    if df.empty:
        return {
            "overall": {"month": target_month, "predicted": 0.0, "method": "no_data"},
            "by_category": [],
        }

    df = df.copy()
    df["txn_date"] = pd.to_datetime(df["txn_date"])
    df["month"] = df["txn_date"].dt.strftime("%Y-%m")
    debits = df[df["direction"] == "debit"]

    monthly_totals = debits.groupby("month")["amount"].sum().sort_index()
    values = list(monthly_totals.values)

    if len(values) >= 4:
        predicted, r2 = _linear_regression_forecast(values)
        method = "linear_regression"
    else:
        predicted = _moving_average(values)
        method = "moving_average"

    # Per-category
    by_category = []
    if "category_name" in debits.columns:
        for cat, grp in debits.groupby("category_name"):
            cat_monthly = grp.groupby("month")["amount"].sum().sort_index()
            cat_values = list(cat_monthly.values)
            if len(cat_values) >= 4:
                cat_pred, _ = _linear_regression_forecast(cat_values)
                cat_method = "linear_regression"
            else:
                cat_pred = _moving_average(cat_values)
                cat_method = "moving_average"
            by_category.append({"category": cat, "predicted": round(cat_pred, 2), "method": cat_method})

    return {
        "overall": {"month": target_month, "predicted": round(predicted, 2), "method": method},
        "by_category": sorted(by_category, key=lambda x: x["predicted"], reverse=True),
    }
