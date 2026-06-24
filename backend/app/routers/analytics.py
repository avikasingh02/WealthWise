from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import DashboardOut, CategoriesOut, TrendsOut, ForecastOut, HealthScoreOut
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _current_period() -> str:
    return date.today().strftime("%Y-%m")


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    period: str = Query(default_factory=_current_period),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = AnalyticsService(db).dashboard(current_user.id, period)
    return DashboardOut(**result)


@router.get("/categories", response_model=CategoriesOut)
def categories(
    period: str = Query(default_factory=_current_period),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = AnalyticsService(db).categories(current_user.id, period)
    return CategoriesOut(**result)


@router.get("/trends", response_model=TrendsOut)
def trends(
    months: int = Query(6, ge=1, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = AnalyticsService(db).trends(current_user.id, months)
    return TrendsOut(**result)


@router.get("/health-score", response_model=HealthScoreOut)
def health_score(
    period: str = Query(default_factory=_current_period),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = AnalyticsService(db).health_score(current_user.id, period)
    return HealthScoreOut(**result)


@router.get("/forecast", response_model=ForecastOut)
def forecast(
    months: int = Query(1, ge=1, le=3),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = AnalyticsService(db).forecast(current_user.id, months)
    return ForecastOut(**result)
