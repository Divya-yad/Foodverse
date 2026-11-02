# 🥗 FoodVerse: Multimodal Food Intelligence Platform

One platform that understands food through **images, video, voice and text**, powered by **Google Gemini**, a **FastAPI** backend and a **React** frontend.

| Requirement | Where it lives |
|---|---|
| Food recognition (image / text / voice) | `POST /api/recognition/{image,text,audio}` · `services/recognition.py` · *Analyze* page |
| Nutrition: kcal, protein, carbs, fat, fiber, health score | totals are **computed server-side** from per-item estimates |
| Freshness: Fresh / Moderately Fresh / Spoiled | `POST /api/freshness/image` · status derived deterministically from score + safety flag |
| Kitchen hygiene from video | `POST /api/hygiene/video` · per-category checks, timestamps, score, grade, alerts |
| Smart cooking assistant | `POST /api/cooking/recipe` (text and/or ingredient photo) · `POST /api/cooking/ask` (step-aware Q&A) |
| Personalized, adaptive meal plans | `POST /api/mealplans/generate` · `/{id}/adapt` · targets from Mifflin-St Jeor |
| Multimodal AI integration | `services/gemini.py`: structured JSON output (Pydantic schemas), Files API for large video |
| Scalable full-stack architecture | routers → services → repositories (ORM), one service module per capability |
| Actionable insights | `GET /api/dashboard` (stats + rule-based alerts) · `/dashboard/insights` (Gemini briefing) · printable reports |

## Quick start (Docker, Postgres included)

```bash
cp .env.example .env
# edit .env: set GEMINI_API_KEY, JWT_SECRET (python -c "import secrets; print(secrets.token_urlsafe(48))"), POSTGRES_PASSWORD
docker compose up --build
# open http://localhost:8080
```

Get a Gemini key at <https://aistudio.google.com/apikey>.

## Local development

```bash
# backend (SQLite by default, no Docker needed)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # add GEMINI_API_KEY and JWT_SECRET
uvicorn app.main:app --reload   # http://localhost:8000/api/docs

# frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173 (proxies /api → :8000)
```

Install `ffmpeg` locally if you want browser voice recordings (webm/mp4) transcoded before they go to Gemini. The Docker image already includes it.

## Tests

```bash
cd backend  && pytest -q && ruff check app tests     # 22 tests, Gemini is faked: no key or network needed
cd frontend && npm test                               # 9 tests (Vitest + Testing Library)
```

## Architecture

```
frontend (React + Vite, CSS animations)  ──/api──▶  nginx  ──▶  FastAPI
                                                                 ├─ routers/    thin HTTP layer, validation, auth
                                                                 ├─ services/   recognition · freshness · hygiene · cooking · mealplan · dashboard
                                                                 │     └─ gemini.py  (single AI gateway, swappable via the AIClient protocol)
                                                                 └─ SQLAlchemy async ─▶ PostgreSQL (SQLite in dev/tests)
```

Design decisions worth knowing:

- **The model estimates; the server decides.** Totals, freshness status, hygiene score/grade, calorie targets and day deviations are all computed in Python from the model's raw observations, so results are consistent and testable.
- **Structured output.** Every Gemini call uses a Pydantic `response_schema`; no brittle JSON-from-text parsing.
- **Prompt-injection hygiene.** User-supplied notes are passed to the model labelled as data, never as instructions.
- **Auth.** bcrypt (cost 12), 15-min JWT access token kept in memory on the client, 7-day refresh token in an `httpOnly` cookie scoped to `/api/auth`. All data queries are scoped to the authenticated user.
- **Uploads.** Content-type allowlist and streaming size caps (image 10 MB, audio 20 MB, video 100 MB). Media above 15 MB goes through the Gemini Files API.
- **Errors** always look like `{ "error": { "code", "message", "details?" } }`.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | – | required for any AI endpoint |
| `GEMINI_MODEL` | `gemini-2.5-flash` | change to any Gemini model that supports image, audio, video and structured output |
| `JWT_SECRET` | – | 32+ chars; the API refuses to start in `ENVIRONMENT=production` with a weak one |
| `DATABASE_URL` | SQLite file | `postgresql+asyncpg://user:pass@host/db` in Docker |
| `COOKIE_SECURE` | `false` | set `true` behind HTTPS |
| `MAX_IMAGE_MB` / `MAX_AUDIO_MB` / `MAX_VIDEO_MB` | 10 / 20 / 100 | |

## Known limits and next steps

- **Estimates, not medical or certification-grade advice.** Calories from a photo are approximate. Freshness is a *visual* check and cannot detect bacteria; the hygiene audit is decision support, not a HACCP certification. The UI says so.
- Tables are created on startup with `create_all`. Add **Alembic** migrations before you evolve the schema in production.
- Video analysis runs inside the request (up to a few minutes). For heavy traffic, move it to a job queue (Celery/RQ/Arq) and poll.
- Add **rate limiting** (e.g. `slowapi` or at the reverse proxy) and an account-deletion endpoint before public launch.
- "Today" on the dashboard uses the browser's UTC offset; a stored per-user timezone would be more robust.
