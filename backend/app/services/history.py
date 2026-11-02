"""Persistence helper for analyses."""
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Analysis, User


async def save_analysis(db: AsyncSession, user: User, kind: str, title: str, result: dict,
                        score: int | None = None, totals: dict | None = None, logged: bool = False) -> Analysis:
    totals = totals or {}
    row = Analysis(
        user_id=user.id, kind=kind, title=(title or kind.title())[:200], score=score,
        calories=totals.get("calories"), protein_g=totals.get("protein_g"),
        carbs_g=totals.get("carbs_g"), fat_g=totals.get("fat_g"),
        logged=logged, result=result,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row
