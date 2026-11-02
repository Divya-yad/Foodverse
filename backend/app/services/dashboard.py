"""Dashboard aggregation, rule-based alerts and AI insights."""
import json
from datetime import datetime, timedelta, timezone

from app.schemas.ai import InsightsAI
from app.services.gemini import AIClient

MEAL_KINDS = ("recognition",)


def _local(dt: datetime, offset_min: int) -> datetime:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (dt + timedelta(minutes=offset_min)).replace(tzinfo=None)


def build(rows: list, targets: dict | None, offset_min: int, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    today = _local(now, offset_min).date()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    series = {d: {"date": d.isoformat(), "calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "meals": 0} for d in days}
    scores, alerts, latest_fresh, latest_hygiene = [], [], None, None

    for r in sorted(rows, key=lambda x: x.created_at, reverse=True):
        d = _local(r.created_at, offset_min).date()
        if r.kind in MEAL_KINDS and r.logged and d in series:
            s = series[d]
            s["meals"] += 1
            for k in ("calories", "protein_g", "carbs_g", "fat_g"):
                s[k] = round(s[k] + (getattr(r, k) or 0), 1)
            if r.score is not None:
                scores.append(r.score)
        if r.kind == "freshness" and (today - d).days <= 3 and r.result.get("status") == "Spoiled":
            alerts.append({"level": "danger", "message": f"{r.title} looked spoiled. Do not eat it.", "id": r.id})
        if r.kind == "freshness" and latest_fresh is None:
            latest_fresh = {"title": r.title, "status": r.result.get("status"), "score": r.score}
        if r.kind == "hygiene" and latest_hygiene is None:
            latest_hygiene = {"score": r.score, "grade": r.result.get("grade"), "created_at": r.created_at.isoformat()}
            if (r.score or 100) < 70:
                alerts.append({"level": "warning", "message": f"Latest kitchen hygiene score is {r.score}/100. Review the violations.", "id": r.id})

    t = series[today]
    if targets:
        if t["calories"] > targets["calories"] * 1.1:
            alerts.append({"level": "warning", "message": f"You are {round(t['calories'] - targets['calories'])} kcal over today's target."})
        if t["meals"] and t["protein_g"] < targets["protein_g"] * 0.5:
            alerts.append({"level": "info", "message": "Protein is under half of today's target. Add a protein-rich meal or snack."})
    if not t["meals"]:
        alerts.append({"level": "info", "message": "No meals logged today. Snap a photo of your next meal."})

    return {
        "today": t, "targets": targets, "week": list(series.values()),
        "avg_health_score": round(sum(scores) / len(scores)) if scores else None,
        "counts": {k: sum(1 for r in rows if r.kind == k) for k in ("recognition", "freshness", "hygiene", "cooking", "mealplan")},
        "latest_freshness": latest_fresh, "latest_hygiene": latest_hygiene, "alerts": alerts,
    }


def recent_average(week: list[dict]) -> dict | None:
    logged = [d for d in week if d["meals"]]
    if not logged:
        return None
    return {k: round(sum(d[k] for d in logged) / len(logged)) for k in ("calories", "protein_g", "carbs_g", "fat_g")}


async def insights(ai: AIClient, summary: dict) -> dict:
    slim = {k: summary[k] for k in ("today", "targets", "week", "avg_health_score", "latest_freshness", "latest_hygiene", "alerts")}
    prompt = ("Turn these nutrition and food-safety stats into a short, encouraging, actionable briefing: a one-line "
              "headline, 3-5 prioritised insights (explain WHY), and 3 concrete recommendations for the next 24 hours. "
              f"Do not give medical diagnoses.\nStats: {json.dumps(slim)}")
    r = await ai.generate_structured(prompt, InsightsAI, None, "You are a supportive nutrition coach.", temperature=0.4)
    return r.model_dump()
