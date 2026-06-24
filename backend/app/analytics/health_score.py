"""Financial Health Score — explainable, composite 0-100."""
from typing import Any


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def compute_health_score(
    savings_rate: float,
    budget_adherence_ratio: float,
    mom_expense_growth: float,
    debt_ratio: float,
) -> dict[str, Any]:
    sr = _clamp(savings_rate / 0.30) * 30
    bd = _clamp(budget_adherence_ratio) * 25
    eg = (1 - _clamp(mom_expense_growth / 0.20)) * 20
    dr = (1 - _clamp(debt_ratio)) * 25

    score = round(sr + bd + eg + dr)
    rating = (
        "Excellent" if score >= 80 else
        "Good" if score >= 60 else
        "Fair" if score >= 40 else
        "Needs Work"
    )

    return {
        "score": score,
        "rating": rating,
        "breakdown": {
            "savings_rate": round(sr),
            "budget_discipline": round(bd),
            "expense_growth": round(eg),
            "debt_ratio": round(dr),
        },
    }
