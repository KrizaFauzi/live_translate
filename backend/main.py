"""Cloud-first API for Deepgram Nova-3 live speech-to-text."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from models.live import LiveStartEvent, TargetLanguageChangedEvent
from models.schemas import HealthResponse
from services.deepgram_live import DeepgramLiveSession, LiveProviderUnavailableError
from services.libretranslate import LibreTranslateService

app = FastAPI()
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005", "http://127.0.0.1:3005"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _deepgram_api_key() -> str:
    return os.getenv("DEEPGRAM_API_KEY", "")


def _libretranslate_url() -> str:
    return os.getenv("LIBRETRANSLATE_URL", "http://libretranslate:5000")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.websocket("/api/live/session")
async def live_session(websocket: WebSocket) -> None:
    """Relay browser PCM to Deepgram and final transcript segments to LibreTranslate."""

    await websocket.accept()
    send_lock = asyncio.Lock()
    deepgram: DeepgramLiveSession | None = None
    provider_task: asyncio.Task[None] | None = None
    translation_tasks: set[asyncio.Task[None]] = set()
    source_language = "id"
    target_language = "en"

    async def send(event: dict[str, object]) -> None:
        async with send_lock:
            await websocket.send_text(json.dumps(event))

    async def translate(segment_id: str, text: str, source: str, target: str) -> None:
        try:
            translated_text = await LibreTranslateService(_libretranslate_url()).translate(text, source, target)  # type: ignore[arg-type]
            await send({"type": "translation.final", "segmentId": segment_id, "text": translated_text, "targetLanguage": target})
        except Exception:
            logger.exception("LibreTranslate request failed")
            await send({"type": "error", "code": "translation_failed", "message": "Local translation is unavailable. Try again shortly.", "recoverable": True})

    async def forward_provider_events(session: DeepgramLiveSession) -> None:
        try:
            async for transcript in session.events():
                if transcript.is_final:
                    segment_id = str(uuid.uuid4())
                    await send(
                        {
                            "type": "transcript.final",
                            "segmentId": segment_id,
                            "text": transcript.text,
                            "detectedLanguage": transcript.detected_language,
                        }
                    )
                    await send({"type": "translation.pending", "segmentId": segment_id, "targetLanguage": target_language})
                    task = asyncio.create_task(translate(segment_id, transcript.text, source_language, target_language))
                    translation_tasks.add(task)
                    task.add_done_callback(translation_tasks.discard)
                else:
                    await send({"type": "transcript.partial", "text": transcript.text})
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Deepgram streaming connection ended unexpectedly")
            await send(
                {
                    "type": "error",
                    "code": "transcription_disconnected",
                    "message": "Deepgram transcription connection was lost. Start a new session.",
                    "recoverable": True,
                }
            )

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            audio = message.get("bytes")
            if audio is not None:
                if deepgram is not None:
                    await deepgram.send_audio(audio)
                continue

            raw_text = message.get("text")
            if not raw_text:
                continue
            try:
                payload = json.loads(raw_text)
            except json.JSONDecodeError:
                await send({"type": "error", "code": "invalid_message", "message": "Message must be valid JSON.", "recoverable": True})
                continue

            event_type = payload.get("type")
            if event_type == "start":
                if deepgram is not None:
                    await send({"type": "error", "code": "already_started", "message": "Live session is already running.", "recoverable": True})
                    continue
                try:
                    start = LiveStartEvent.model_validate(payload)
                    await send({"type": "session.status", "status": "connecting"})
                    deepgram = DeepgramLiveSession(_deepgram_api_key(), start.sourceLanguage)
                    await deepgram.open()
                except (ValidationError, LiveProviderUnavailableError) as exc:
                    deepgram = None
                    await send({"type": "error", "code": "live_mode_unavailable", "message": str(exc), "recoverable": False})
                    continue

                source_language = start.sourceLanguage
                target_language = start.targetLanguage
                provider_task = asyncio.create_task(forward_provider_events(deepgram))
                await send({"type": "session.status", "status": "listening"})
                continue

            if event_type == "target_language.changed":
                try:
                    target_language = TargetLanguageChangedEvent.model_validate(payload).targetLanguage
                except ValidationError as exc:
                    await send({"type": "error", "code": "invalid_target_language", "message": str(exc), "recoverable": True})
                continue

            if event_type == "stop":
                await send({"type": "session.status", "status": "stopped"})
                break

            await send({"type": "error", "code": "unknown_event", "message": "Unsupported live session event.", "recoverable": True})
    except WebSocketDisconnect:
        pass
    finally:
        if provider_task is not None:
            provider_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await provider_task
        for task in translation_tasks:
            task.cancel()
        if translation_tasks:
            await asyncio.gather(*translation_tasks, return_exceptions=True)
        if deepgram is not None:
            await deepgram.close()
