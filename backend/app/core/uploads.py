"""Safe upload reading: content-type allowlist, streaming size cap, audio normalisation."""
import asyncio
import shutil

from fastapi import UploadFile

from app.core.errors import AppError

GEMINI_AUDIO = {"audio/wav", "audio/x-wav", "audio/mp3", "audio/mpeg", "audio/aiff", "audio/aac", "audio/ogg", "audio/flac"}


async def read_upload(file: UploadFile, kinds: tuple[str, ...], max_mb: int) -> tuple[bytes, str]:
    mime = (file.content_type or "").split(";")[0].strip().lower()
    if not any(mime.startswith(f"{k}/") for k in kinds):
        raise AppError(415, "unsupported_media", f"Unsupported file type '{mime or 'unknown'}'. Expected: {', '.join(kinds)}.")
    limit = max_mb * 1024 * 1024
    buf = bytearray()
    while chunk := await file.read(1024 * 1024):
        buf.extend(chunk)
        if len(buf) > limit:
            raise AppError(413, "file_too_large", f"File exceeds the {max_mb} MB limit.")
    if not buf:
        raise AppError(400, "empty_file", "The uploaded file is empty.")
    return bytes(buf), mime


async def normalize_audio(data: bytes, mime: str) -> tuple[bytes, str]:
    """Browsers record webm/mp4; Gemini wants wav/mp3/ogg/etc. Transcode with ffmpeg when needed."""
    if mime in GEMINI_AUDIO or not shutil.which("ffmpeg"):
        return data, mime
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "mp3", "pipe:1",
        stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    out, _ = await proc.communicate(data)
    if proc.returncode != 0 or not out:
        return data, mime
    return out, "audio/mp3"
