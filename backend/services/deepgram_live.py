"""Deepgram Nova-3 streaming relay used by the browser WebSocket endpoint."""

from __future__ import annotations

import contextlib
import json
from typing import AsyncIterator
from urllib.parse import urlencode

from models.live import LiveProviderTranscript, SourceLanguage


class LiveProviderUnavailableError(RuntimeError):
    """Raised when a required cloud provider or its dependency is unavailable."""


class DeepgramLiveSession:
    """One Deepgram streaming connection for a manually selected source language."""

    def __init__(self, api_key: str, source_language: SourceLanguage):
        self._api_key = api_key
        self._source_language = source_language
        self._socket = None
        self._final_fragments: list[str] = []

    async def open(self) -> None:
        if not self._api_key:
            raise LiveProviderUnavailableError(
                "Live Mode is not configured. Add DEEPGRAM_API_KEY to the backend environment."
            )
        try:
            from websockets.asyncio.client import connect
        except ImportError as exc:
            raise LiveProviderUnavailableError("Deepgram streaming dependency is unavailable.") from exc

        query = urlencode(
            {
                "model": "nova-3",
                "language": self._source_language,
                "encoding": "linear16",
                "sample_rate": "16000",
                "channels": "1",
                "interim_results": "true",
                "endpointing": "300",
                "punctuate": "true",
                "smart_format": "true",
            }
        )
        try:
            self._socket = await connect(
                f"wss://api.deepgram.com/v1/listen?{query}",
                additional_headers={"Authorization": f"Token {self._api_key}"},
                max_size=None,
            )
        except Exception as exc:
            raise LiveProviderUnavailableError("Could not connect to Deepgram Live transcription.") from exc

    async def send_audio(self, frame: bytes) -> None:
        if self._socket is not None:
            await self._socket.send(frame)

    async def events(self) -> AsyncIterator[LiveProviderTranscript]:
        if self._socket is None:
            return
        async for raw_message in self._socket:
            if not isinstance(raw_message, str):
                continue
            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                continue

            if message.get("type") == "UtteranceEnd":
                final_text = self._take_final_text()
                if final_text:
                    yield LiveProviderTranscript(text=final_text, is_final=True, detected_language=self._source_language)
                continue

            if message.get("type") != "Results":
                continue
            alternatives = message.get("channel", {}).get("alternatives", [])
            transcript = alternatives[0].get("transcript", "").strip() if alternatives else ""
            if transcript and message.get("is_final"):
                self._final_fragments.append(transcript)
            elif transcript:
                yield LiveProviderTranscript(text=transcript, is_final=False)

            if message.get("speech_final"):
                final_text = self._take_final_text()
                if final_text:
                    yield LiveProviderTranscript(text=final_text, is_final=True, detected_language=self._source_language)

    def _take_final_text(self) -> str:
        text = " ".join(self._final_fragments).strip()
        self._final_fragments.clear()
        return text

    async def close(self) -> None:
        if self._socket is None:
            return
        with contextlib.suppress(Exception):
            await self._socket.send(json.dumps({"type": "CloseStream"}))
        with contextlib.suppress(Exception):
            await self._socket.close()
        self._socket = None
