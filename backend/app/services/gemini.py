"""Thin wrapper around the Google Gen AI SDK: structured JSON output, text output, large-media upload."""
from __future__ import annotations

import asyncio
import io
import logging
from dataclasses import dataclass
from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.errors import AIError

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)
INLINE_LIMIT = 15 * 1024 * 1024  # bigger media goes through the Files API


@dataclass
class Media:
    data: bytes
    mime_type: str


class AIClient(Protocol):
    async def generate_structured(self, prompt: str, schema: type[T], media: list[Media] | None = None, system: str | None = None, temperature: float = 0.2) -> T: ...

    async def generate_text(self, prompt: str, system: str | None = None, temperature: float = 0.5) -> str: ...


class GeminiService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._client = None

    @property
    def client(self):
        if self._client is None:
            if not self.settings.gemini_api_key:
                raise AIError("GEMINI_API_KEY is not configured on the server.")
            from google import genai

            self._client = genai.Client(api_key=self.settings.gemini_api_key)
        return self._client

    async def _part(self, m: Media):
        from google.genai import types

        if len(m.data) <= INLINE_LIMIT:
            return types.Part.from_bytes(data=m.data, mime_type=m.mime_type)
        f = await self.client.aio.files.upload(file=io.BytesIO(m.data), config=types.UploadFileConfig(mime_type=m.mime_type))
        for _ in range(60):  # up to ~2 minutes of server-side processing
            state = f.state.name if f.state else "ACTIVE"
            if state == "ACTIVE":
                return types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)
            if state == "FAILED":
                raise AIError("Gemini could not process the uploaded media.")
            await asyncio.sleep(2)
            f = await self.client.aio.files.get(name=f.name)
        raise AIError("Timed out while Gemini was processing the media.")

    async def _call(self, contents: list, config):
        last: Exception | None = None
        for attempt in range(2):
            try:
                return await self.client.aio.models.generate_content(model=self.settings.gemini_model, contents=contents, config=config)
            except AIError:
                raise
            except Exception as exc:  # network, quota, safety...
                last = exc
                log.warning("Gemini call failed (attempt %s): %s", attempt + 1, exc)
                await asyncio.sleep(1.5 * (attempt + 1))
        raise AIError() from last

    async def generate_structured(self, prompt, schema, media=None, system=None, temperature=0.2):
        from google.genai import types

        parts = [await self._part(m) for m in (media or [])]
        config = types.GenerateContentConfig(
            system_instruction=system, response_mime_type="application/json",
            response_schema=schema, temperature=temperature,
        )
        resp = await self._call([*parts, prompt], config)
        parsed = getattr(resp, "parsed", None)
        if isinstance(parsed, schema):
            return parsed
        try:
            return schema.model_validate_json(resp.text or "")
        except Exception as exc:
            raise AIError("The AI returned an unreadable response. Please try again.") from exc

    async def generate_text(self, prompt, system=None, temperature=0.5):
        from google.genai import types

        config = types.GenerateContentConfig(system_instruction=system, temperature=temperature)
        resp = await self._call([prompt], config)
        return (resp.text or "").strip()


_ai: GeminiService | None = None


def get_ai() -> AIClient:
    global _ai
    if _ai is None:
        _ai = GeminiService(get_settings())
    return _ai
