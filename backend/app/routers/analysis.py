"""Image/text/audio recognition, freshness, hygiene, cooking, and history endpoints."""
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import AppError
from app.core.uploads import normalize_audio, read_upload
from app.deps import current_user
from app.models import Analysis, User
from app.schemas.api import AnalysisOut, AnalysisPatch, AskIn, AskOut, TextMealIn
from app.services import cooking, freshness, hygiene, recognition
from app.services.gemini import AIClient, get_ai
from app.services.history import save_analysis

router = APIRouter(tags=["analysis"])
settings = get_settings()


# ---- Recognition & nutrition -------------------------------------------------
async def _save_meal(db, user, result: dict, source: str, log: bool) -> Analysis:
    result["source"] = source
    return await save_analysis(db, user, "recognition", result["dish_name"] or "Meal", result,
                               score=result["health_score"], totals=result["totals"], logged=log)


@router.post("/recognition/image", response_model=AnalysisOut)
async def recognize_image(file: UploadFile = File(...), note: str = Form("", max_length=300), log: bool = Form(True),
                          user: User = Depends(current_user), db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    data, mime = await read_upload(file, ("image",), settings.max_image_mb)
    return await _save_meal(db, user, await recognition.analyze_image(ai, data, mime, note), "image", log)


@router.post("/recognition/text", response_model=AnalysisOut)
async def recognize_text(body: TextMealIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db),
                         ai: AIClient = Depends(get_ai)):
    return await _save_meal(db, user, await recognition.analyze_text(ai, body.description), "text", True)


@router.post("/recognition/audio", response_model=AnalysisOut)
async def recognize_audio(file: UploadFile = File(...), user: User = Depends(current_user),
                          db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    data, mime = await read_upload(file, ("audio", "video"), settings.max_audio_mb)  # webm voice notes arrive as video/webm
    data, mime = await normalize_audio(data, mime)
    return await _save_meal(db, user, await recognition.analyze_audio(ai, data, mime), "audio", True)


# ---- Freshness ---------------------------------------------------------------
@router.post("/freshness/image", response_model=AnalysisOut)
async def freshness_image(file: UploadFile = File(...), hint: str = Form("", max_length=200),
                          user: User = Depends(current_user), db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    data, mime = await read_upload(file, ("image",), settings.max_image_mb)
    result = await freshness.analyze(ai, data, mime, hint)
    return await save_analysis(db, user, "freshness", result["food_name"], result, score=result["freshness_score"])


# ---- Hygiene -----------------------------------------------------------------
@router.post("/hygiene/video", response_model=AnalysisOut)
async def hygiene_video(file: UploadFile = File(...), area: str = Form("", max_length=200),
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    data, mime = await read_upload(file, ("video",), settings.max_video_mb)
    result = await hygiene.analyze(ai, data, mime, area)
    return await save_analysis(db, user, "hygiene", area or "Kitchen audit", result, score=result["score"])


# ---- Cooking -----------------------------------------------------------------
@router.post("/cooking/recipe", response_model=AnalysisOut)
async def cooking_recipe(query: str = Form("", max_length=500), servings: int = Form(2, ge=1, le=20),
                         dietary: str = Form("", max_length=200), max_minutes: int | None = Form(None, ge=5, le=600),
                         skill: str = Form("intermediate", max_length=20), file: UploadFile | None = File(None),
                         user: User = Depends(current_user), db: AsyncSession = Depends(get_db), ai: AIClient = Depends(get_ai)):
    image = await read_upload(file, ("image",), settings.max_image_mb) if file else None
    if not query.strip() and not image:
        raise AppError(422, "empty_request", "Tell me what you'd like to cook or upload a photo of your ingredients.")
    diet = [d.strip() for d in dietary.split(",") if d.strip()]
    result = await cooking.generate_recipe(ai, query, servings, diet, max_minutes, skill, image)
    return await save_analysis(db, user, "cooking", result["title"], result)


@router.post("/cooking/ask", response_model=AskOut)
async def cooking_ask(body: AskIn, user: User = Depends(current_user), ai: AIClient = Depends(get_ai)):
    return AskOut(answer=await cooking.ask(ai, body.question, body.recipe, body.step))


# ---- History -----------------------------------------------------------------
@router.get("/analyses", response_model=list[AnalysisOut])
async def list_analyses(kind: str | None = None, limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    q = select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.created_at.desc()).limit(limit).offset(offset)
    if kind:
        q = q.where(Analysis.kind == kind)
    return (await db.execute(q)).scalars().all()


async def _owned(db: AsyncSession, user: User, analysis_id: str) -> Analysis:
    row = await db.get(Analysis, analysis_id)
    if not row or row.user_id != user.id:
        raise AppError(404, "not_found", "Analysis not found.")
    return row


@router.get("/analyses/{analysis_id}", response_model=AnalysisOut)
async def get_analysis(analysis_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await _owned(db, user, analysis_id)


@router.patch("/analyses/{analysis_id}", response_model=AnalysisOut)
async def patch_analysis(analysis_id: str, body: AnalysisPatch, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    row = await _owned(db, user, analysis_id)
    row.logged = body.logged
    await db.commit()
    return row


@router.delete("/analyses/{analysis_id}", status_code=204)
async def delete_analysis(analysis_id: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await _owned(db, user, analysis_id)
    await db.execute(delete(Analysis).where(Analysis.id == analysis_id))
    await db.commit()
