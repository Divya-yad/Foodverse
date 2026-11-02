"""Request/response schemas for the public API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=72)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: EmailStr
    full_name: str
    role: str


class ProfileIn(BaseModel):
    age: int | None = Field(None, ge=10, le=100)
    sex: Literal["male", "female", "other"] | None = None
    height_cm: float | None = Field(None, ge=100, le=250)
    weight_kg: float | None = Field(None, ge=25, le=300)
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"] = "moderate"
    goal: Literal["lose_weight", "maintain", "gain_weight", "build_muscle"] = "maintain"
    diet_type: Literal["none", "vegetarian", "vegan", "eggetarian", "pescatarian", "keto", "jain"] = "none"
    allergies: list[str] = Field(default_factory=list, max_length=20)
    dislikes: list[str] = Field(default_factory=list, max_length=30)
    cuisines: list[str] = Field(default_factory=list, max_length=15)


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)


class AnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    kind: str
    title: str
    score: int | None
    calories: float | None
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    logged: bool
    result: dict
    created_at: datetime


class AnalysisPatch(BaseModel):
    logged: bool


class TextMealIn(BaseModel):
    description: str = Field(min_length=3, max_length=1000)


class AskIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    recipe: dict | None = None
    step: int | None = None


class AskOut(BaseModel):
    answer: str


class MealPlanIn(BaseModel):
    days: int = Field(3, ge=1, le=7)
    meals_per_day: int = Field(3, ge=2, le=6)
    notes: str = Field("", max_length=500)


class AdaptIn(BaseModel):
    feedback: str = Field(min_length=3, max_length=800)
