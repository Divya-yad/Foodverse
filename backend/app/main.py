"""FoodVerse API entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.database import init_db
from app.core.errors import AppError
from app.routers import analysis, auth, planning, profile

logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_for_runtime()
    await init_db()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_list, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])


def _err(status: int, code: str, message: str, details=None) -> JSONResponse:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status, content=body)


@app.exception_handler(AppError)
async def app_error(_: Request, exc: AppError):
    return _err(exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    return _err(exc.status_code, "http_error", str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
    return _err(422, "validation_error", "Some fields are invalid.", details)


@app.get("/api/health", tags=["meta"])
async def health():
    return {"status": "ok", "ai_configured": bool(settings.gemini_api_key)}


for r in (auth.router, profile.router, analysis.router, planning.router):
    app.include_router(r, prefix="/api")
