from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import create_token, decode_token, hash_password, verify_password
from app.deps import current_user
from app.models import User
from app.schemas.api import LoginIn, RegisterIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])
COOKIE = "fv_refresh"


def _issue(user: User, response: Response) -> TokenOut:
    s = get_settings()
    access = create_token(user.id, "access", timedelta(minutes=s.access_token_minutes))
    refresh = create_token(user.id, "refresh", timedelta(days=s.refresh_token_days))
    response.set_cookie(COOKIE, refresh, max_age=s.refresh_token_days * 86400, httponly=True,
                        secure=s.cookie_secure, samesite="lax", path="/api/auth")
    return TokenOut(access_token=access)


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(body: RegisterIn, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.lower()
    if (await db.execute(select(User).where(User.email == email))).scalar_one_or_none():
        raise AppError(409, "email_taken", "An account with this email already exists.")
    user = User(email=email, full_name=body.full_name.strip(), hashed_password=hash_password(body.password))
    db.add(user)
    await db.commit()
    return _issue(user, response)


@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.email == body.email.lower()))).scalar_one_or_none()
    if not verify_password(body.password, user.hashed_password if user else None) or not user.is_active:
        raise AppError(401, "invalid_credentials", "Incorrect email or password.")
    return _issue(user, response)


@router.post("/refresh", response_model=TokenOut)
async def refresh(response: Response, fv_refresh: str | None = Cookie(None), db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(fv_refresh or "", "refresh")
    except ValueError:
        raise AppError(401, "invalid_refresh", "Session expired. Please sign in again.") from None
    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise AppError(401, "invalid_refresh", "Session expired. Please sign in again.")
    return _issue(user, response)


@router.post("/logout", status_code=204)
async def logout(response: Response):
    response.delete_cookie(COOKIE, path="/api/auth")


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user
