"""Meal plans and dashboard."""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import AppError
from app.deps import current_user
from app.models import Analysis, User, UserProfile
from app.schemas.api import AdaptIn, AnalysisOut, MealPlanIn
from app.services import dashboard, mealplan
from app.services.gemini import AIClient, get_ai
from app.services.history import save_analysis

router = APIRouter(tags=["planning"])


async def _summary(db: AsyncSession, user: User, offset: int) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=9)
    rows = (await db.execute(select(Analysis).where(Analysis.user_id == user.id, Analysis.created_at >= since))).scalars().all()
    try:
        targets = mealplan.nutrition_targets(user.profile or UserProfile())
    except AppError:
        targets = None
    return dashboard.build(list(rows), targets, offset)


@router.post("/mealplans/generate", response_model=AnalysisOut)
async def generate_plan(body: MealPlanIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    result = await mealplan.generate(ai, user.profile or UserProfile(), body.days, body.meals_per_day, body.notes)
    result["version"] = 1
    return await save_analysis(db, user, "mealplan", f"{body.days}-day plan · {result['targets']['calories']} kcal", result)


@router.post("/mealplans/{plan_id}/adapt", response_model=AnalysisOut)
async def adapt_plan(plan_id: str, body: AdaptIn, offset: int = Query(0, ge=-840, le=840), user: User = Depends(current_user),
                     db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    prev = await db.get(Analysis, plan_id)
    if not prev or prev.user_id != user.id or prev.kind != "mealplan":
        raise AppError(404, "not_found", "Meal plan not found.")
    avg = dashboard.recent_average((await _summary(db, user, offset))["week"])
    result = await mealplan.adapt(ai, user.profile or UserProfile(), prev.result, body.feedback, avg)
    result["version"] = prev.result.get("version", 1) + 1
    return await save_analysis(db, user, "mealplan", f"{len(result['days'])}-day plan v{result['version']}", result)


@router.get("/dashboard")
async def get_dashboard(offset: int = Query(0, ge=-840, le=840, description="Client UTC offset in minutes"),
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await _summary(db, user, offset)


@router.get("/dashboard/insights")
async def get_insights(offset: int = Query(0, ge=-840, le=840), user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    return await dashboard.insights(ai, await _summary(db, user, offset))
