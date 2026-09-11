"""Small, dependency-free client for the internal LibreTranslate container."""

from __future__ import annotations

import asyncio
import json
from urllib.request import Request, urlopen

from models.live import SourceLanguage, TargetLanguage


class LibreTranslateService:
    def __init__(self, base_url: str):
        self._base_url = base_url.rstrip("/")

    async def translate(self, text: str, source: SourceLanguage, target: TargetLanguage) -> str:
        if source == target:
            return text
        return await asyncio.to_thread(self._translate_sync, text, source, target)

    def _translate_sync(self, text: str, source: SourceLanguage, target: TargetLanguage) -> str:
        request = Request(
            f"{self._base_url}/translate",
            data=json.dumps({"q": text, "source": source, "target": target, "format": "text"}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=20) as response:  # nosec B310 - fixed, internal Docker URL
            translated_text = json.loads(response.read().decode()).get("translatedText", "").strip()
        if not translated_text:
            raise RuntimeError("LibreTranslate returned no translated text.")
        return translated_text
