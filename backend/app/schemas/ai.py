"""Structured-output schemas sent to Gemini. No defaults (Gemini schema friendly); every field is required."""
from pydantic import BaseModel, Field


class FoodItemAI(BaseModel):
    name: str
    confidence: float = Field(description="0 to 1")
    portion: str = Field(description="Human readable portion, e.g. '1 bowl (250 g)'")
    grams: float
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float


class RecognitionAI(BaseModel):
    is_food: bool = Field(description="False if the input contains no food or meal description")
    dish_name: str
    cuisine: str = Field(description="Cuisine or empty string")
    transcript: str = Field(description="Verbatim transcript for audio input, otherwise empty string")
    items: list[FoodItemAI]
    health_score: int = Field(description="0 to 100 overall healthiness of the meal")
    health_summary: str
    tips: list[str]


class FreshIndicator(BaseModel):
    name: str = Field(description="e.g. color, texture, mold, moisture, bruising")
    observation: str
    severity: str = Field(description="one of: none, mild, moderate, severe")


class FreshnessAI(BaseModel):
    is_food: bool
    food_name: str
    freshness_score: int = Field(description="0 (spoiled) to 100 (perfectly fresh)")
    confidence: float = Field(description="0 to 1")
    indicators: list[FreshIndicator]
    safe_to_eat: bool
    estimated_shelf_life: str
    recommendation: str
    storage_tips: list[str]


class HygieneCheck(BaseModel):
    category: str = Field(description="one of: gloves, hair_cap, apron, handwashing, food_handling, surface_cleanliness, cross_contamination")
    status: str = Field(description="one of: compliant, partial, non_compliant, not_observed")
    evidence: str
    timestamp: str = Field(description="mm:ss of the clearest evidence or empty string")


class HygieneViolation(BaseModel):
    category: str
    severity: str = Field(description="one of: low, medium, high")
    timestamp: str
    description: str


class HygieneAI(BaseModel):
    is_kitchen: bool = Field(description="False if the video does not show food preparation")
    people_observed: int
    checks: list[HygieneCheck]
    violations: list[HygieneViolation]
    summary: str
    recommendations: list[str]


class Ingredient(BaseModel):
    name: str
    quantity: str


class CookStep(BaseModel):
    instruction: str
    duration_min: int = Field(description="0 if not time based")
    tip: str = Field(description="Optional tip or empty string")


class RecipeAI(BaseModel):
    title: str
    description: str
    servings: int
    prep_min: int
    cook_min: int
    difficulty: str
    ingredients: list[Ingredient]
    steps: list[CookStep]
    calories_per_serving: float
    protein_g: float
    carbs_g: float
    fat_g: float
    substitutions: list[str]
    chef_tips: list[str]


class Meal(BaseModel):
    type: str = Field(description="breakfast, lunch, dinner or snack")
    name: str
    description: str
    ingredients: list[str]
    prep_min: int
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class PlanDay(BaseModel):
    day: int
    meals: list[Meal]


class MealPlanAI(BaseModel):
    days: list[PlanDay]
    grocery_list: list[str]
    tips: list[str]


class Insight(BaseModel):
    title: str
    detail: str
    priority: str = Field(description="one of: high, medium, low")


class InsightsAI(BaseModel):
    headline: str
    insights: list[Insight]
    recommendations: list[str]
