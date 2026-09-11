"""Client for a local whisper.cpp HTTP server."""

from __future__ import annotations

import asyncio
import io
import json
import wave
from urllib.request import Request, urlopen

from models.live import SourceLanguage


class WhisperCppService:
    def __init__(self, base_url: str):
        self._base_url = base_url.rstrip("/")

    async def transcribe(self, pcm: bytes, language: SourceLanguage) -> str:
        return await asyncio.to_thread(self._transcribe_sync, pcm, language)

    def _transcribe_sync(self, pcm: bytes, language: SourceLanguage) -> str:
        wav_data = _as_wav(pcm)
        body, boundary = _multipart_wav(wav_data, language)
        request = Request(
            f"{self._base_url}/inference",
            data=body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urlopen(request, timeout=45) as response:  # nosec B310 - fixed, internal Docker URL
            payload = json.loads(response.read().decode())
        text = payload.get("text", "").strip()
        if not text:
            return ""
        return text


def _as_wav(pcm: bytes) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(16_000)
        wav.writeframes(pcm)
    return buffer.getvalue()


def _multipart_wav(wav_data: bytes, language: SourceLanguage) -> tuple[bytes, str]:
    boundary = "----voice-translate-whisper"
    parts = [
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"response_format\"\r\n\r\njson\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n{language}\r\n".encode(),
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"segment.wav\"\r\nContent-Type: audio/wav\r\n\r\n".encode(),
        wav_data,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    return b"".join(parts), boundary
