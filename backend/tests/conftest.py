import os

os.environ.update(DATABASE_URL="sqlite+aiosqlite://", JWT_SECRET="test-secret-test-secret-test-secret-123", ENVIRONMENT="test")

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas import ai as s  # noqa: E402
from app.services.gemini import get_ai  # noqa: E402

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64


def _item(name="Dal", kcal=200.0, p=10.0, c=30.0, f=4.0):
    return s.FoodItemAI(name=name, confidence=0.9, portion="1 bowl", grams=200, calories=kcal, protein_g=p, carbs_g=c, fat_g=f, fiber_g=5)


class FakeAI:
    """Returns canned structured outputs keyed by schema; records prompts."""

    def __init__(self):
        self.prompts: list[str] = []
        self.overrides: dict = {}

    async def generate_structured(self, prompt, schema, media=None, system=None, temperature=0.2):
        self.prompts.append(prompt)
        if schema in self.overrides:
            return self.overrides[schema]
        return {
            s.RecognitionAI: lambda: s.RecognitionAI(is_food=True, dish_name="Dal Rice", cuisine="Indian", transcript="", items=[_item(), _item("Rice", 250, 5, 55, 1)],
                                                     health_score=82, health_summary="Balanced", tips=["Add salad"]),
            s.FreshnessAI: lambda: s.FreshnessAI(is_food=True, food_name="Banana", freshness_score=55, confidence=0.8,
                                                 indicators=[s.FreshIndicator(name="color", observation="brown spots", severity="mild")],
                                                 safe_to_eat=True, estimated_shelf_life="1-2 days", recommendation="Eat soon", storage_tips=[]),
            s.HygieneAI: lambda: s.HygieneAI(is_kitchen=True, people_observed=2, summary="ok", recommendations=[],
                                             checks=[s.HygieneCheck(category="gloves", status="compliant", evidence="worn", timestamp="00:05"),
                                                     s.HygieneCheck(category="hair_cap", status="non_compliant", evidence="none", timestamp="00:10"),
                                                     s.HygieneCheck(category="apron", status="not_observed", evidence="", timestamp="")],
                                             violations=[s.HygieneViolation(category="hair_cap", severity="high", timestamp="00:10", description="No cap")]),
            s.RecipeAI: lambda: s.RecipeAI(title="Veg Pulao", description="d", servings=2, prep_min=10, cook_min=20, difficulty="easy",
                                           ingredients=[s.Ingredient(name="Rice", quantity="1 cup")], steps=[s.CookStep(instruction="Cook", duration_min=20, tip="")],
                                           calories_per_serving=400, protein_g=10, carbs_g=70, fat_g=8, substitutions=[], chef_tips=[]),
            s.MealPlanAI: lambda: s.MealPlanAI(days=[s.PlanDay(day=1, meals=[
                s.Meal(type="breakfast", name="Poha", description="d", ingredients=["poha"], prep_min=10, calories=400, protein_g=10, carbs_g=60, fat_g=10),
                s.Meal(type="lunch", name="Dal", description="d", ingredients=["dal"], prep_min=20, calories=600, protein_g=30, carbs_g=80, fat_g=12)])],
                grocery_list=["poha", "dal"], tips=[]),
            s.InsightsAI: lambda: s.InsightsAI(headline="Nice start", insights=[s.Insight(title="Protein", detail="low", priority="high")], recommendations=["Eat eggs"]),
        }[schema]()

    async def generate_text(self, prompt, system=None, temperature=0.5):
        self.prompts.append(prompt)
        return "Lower the heat and stir."


@pytest.fixture
def fake_ai():
    return FakeAI()


@pytest_asyncio.fixture
async def client(fake_ai):
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _db():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_ai] = lambda: fake_ai
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest_asyncio.fixture
async def authed(client):
    r = await client.post("/api/auth/register", json={"email": "Divya@Example.com", "password": "supersecret1", "full_name": "Divya"})
    assert r.status_code == 201
    client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return client


@pytest.fixture
def png():
    return {"file": ("meal.png", PNG, "image/png")}
