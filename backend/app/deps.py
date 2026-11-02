"""Shared FastAPI dependencies."""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.errors import AppError
from app.core.security import decode_token
from app.models import User

bearer = HTTPBearer(auto_error=False)


async def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauth = AppError(401, "unauthenticated", "Not authenticated.")
    if creds is None:
        raise unauth
    try:
        payload = decode_token(creds.credentials, "access")
    except ValueError:
        raise unauth from None
    user = await db.get(User, payload["sub"])
    if user is None or not user.is_active:
        raise unauth
    return user
