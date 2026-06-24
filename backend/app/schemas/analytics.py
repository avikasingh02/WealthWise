from decimal import Decimal
from pydantic import BaseModel


class DashboardOut(BaseModel):
    income: Decimal
    expenses: Decimal
    savings: Decimal
    savings_rate: float
    top_category: str | None
    txn_count: int


class CategoryShare(BaseModel):
    category: str
    amount: Decimal
    pct: float


class CategoriesOut(BaseModel):
    period: str
    breakdown: list[CategoryShare]


class MonthPoint(BaseModel):
    month: str
    expenses: Decimal
    income: Decimal


class TrendsOut(BaseModel):
    series: list[MonthPoint]
    rolling_avg_3m: list[MonthPoint]
    fastest_growing_category: str | None


class ForecastPoint(BaseModel):
    month: str
    predicted: Decimal
    method: str


class CategoryForecast(BaseModel):
    category: str
    predicted: Decimal
    method: str


class ForecastOut(BaseModel):
    overall: ForecastPoint
    by_category: list[CategoryForecast]


class HealthScoreOut(BaseModel):
    score: int
    rating: str
    breakdown: dict
