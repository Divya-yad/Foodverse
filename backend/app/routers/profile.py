from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.deps import current_user
from app.models import User, UserProfile
from app.schemas.api import ProfileIn, ProfileOut
from app.services.mealplan import nutrition_targets

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(user: User = Depends(current_user)):
    return user.profile or ProfileIn()


@router.put("", response_model=ProfileOut)
async def put_profile(body: ProfileIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user.profile is None:
        user.profile = UserProfile(user_id=user.id)
    for k, v in body.model_dump().items():
        setattr(user.profile, k, v)
    db.add(user)
    await db.commit()
    return user.profile


@router.get("/targets")
async def targets(user: User = Depends(current_user)):
    return nutrition_targets(user.profile or UserProfile())
