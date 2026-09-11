"""Local whisper.cpp speech-to-text plus LibreTranslate live relay."""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import math
import os
import uuid
from array import array

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from models.live import LiveStartEvent, TargetLanguageChangedEvent
from models.schemas import HealthResponse
from services.libretranslate import LibreTranslateService
from services.whisper_cpp import WhisperCppService

app = FastAPI()
logger = logging.getLogger(__name__)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3005", "http://127.0.0.1:3005"], allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


def _whisper_url() -> str:
    return os.getenv("WHISPER_CPP_URL", "http://whispercpp:8080")


def _libretranslate_url() -> str:
    return os.getenv("LIBRETRANSLATE_URL", "http://libretranslate:5000")


class SpeechChunker:
    """Collect PCM until a short pause, then return one utterance for transcription."""

    silence_threshold = 350
    end_silence_frames = 7  # Browser sends 100 ms PCM frames.
    max_frames = 150  # Never send more than 15 seconds in one request.

    def __init__(self) -> None:
        self._frames: list[bytes] = []
        self._speech_seen = False
        self._silent_frames = 0

    def push(self, frame: bytes) -> bytes | None:
        if _rms(frame) >= self.silence_threshold:
            self._speech_seen = True
            self._silent_frames = 0
        elif self._speech_seen:
            self._silent_frames += 1
        else:
            return None

        self._frames.append(frame)
        if self._speech_seen and (self._silent_frames >= self.end_silence_frames or len(self._frames) >= self.max_frames):
            return self.take()
        return None

    def take(self) -> bytes | None:
        if not self._speech_seen:
            self._frames.clear()
            return None
        chunk = b"".join(self._frames)
        self._frames.clear()
        self._speech_seen = False
        self._silent_frames = 0
        return chunk


def _rms(pcm: bytes) -> float:
    samples = array("h")
    samples.frombytes(pcm)
    if not samples:
        return 0
    return math.sqrt(sum(sample * sample for sample in samples) / len(samples))


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.websocket("/api/live/session")
async def live_session(websocket: WebSocket) -> None:
    await websocket.accept()
    send_lock = asyncio.Lock()
    transcription_tasks: set[asyncio.Task[None]] = set()
    translation_tasks: set[asyncio.Task[None]] = set()
    chunker: SpeechChunker | None = None
    source_language = "id"
    target_language = "en"

    async def send(event: dict[str, object]) -> None:
        async with send_lock:
            await websocket.send_text(json.dumps(event))

    async def translate(segment_id: str, text: str, source: str, target: str) -> None:
        try:
            translated = await LibreTranslateService(_libretranslate_url()).translate(text, source, target)  # type: ignore[arg-type]
            await send({"type": "translation.final", "segmentId": segment_id, "text": translated, "targetLanguage": target})
        except Exception:
            logger.exception("LibreTranslate request failed")
            await send({"type": "error", "code": "translation_failed", "message": "Local translation is unavailable. Try again shortly.", "recoverable": True})

    async def transcribe(chunk: bytes, source: str, target: str) -> None:
        try:
            text = await WhisperCppService(_whisper_url()).transcribe(chunk, source)  # type: ignore[arg-type]
            if not text:
                return
            segment_id = str(uuid.uuid4())
            await send({"type": "transcript.final", "segmentId": segment_id, "text": text, "detectedLanguage": source})
            await send({"type": "translation.pending", "segmentId": segment_id, "targetLanguage": target})
            task = asyncio.create_task(translate(segment_id, text, source, target))
            translation_tasks.add(task)
            task.add_done_callback(translation_tasks.discard)
        except Exception:
            logger.exception("whisper.cpp transcription failed")
            await send({"type": "error", "code": "transcription_failed", "message": "Local whisper.cpp transcription is unavailable. Try again shortly.", "recoverable": True})

    def schedule_transcription(chunk: bytes | None) -> None:
        if not chunk:
            return
        task = asyncio.create_task(transcribe(chunk, source_language, target_language))
        transcription_tasks.add(task)
        task.add_done_callback(transcription_tasks.discard)

    try:
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break
            if message.get("bytes") is not None:
                if chunker is not None:
                    schedule_transcription(chunker.push(message["bytes"]))
                continue
            if not message.get("text"):
                continue
            try:
                payload = json.loads(message["text"])
            except json.JSONDecodeError:
                await send({"type": "error", "code": "invalid_message", "message": "Message must be valid JSON.", "recoverable": True})
                continue

            if payload.get("type") == "start":
                try:
                    start = LiveStartEvent.model_validate(payload)
                except ValidationError as exc:
                    await send({"type": "error", "code": "invalid_start", "message": str(exc), "recoverable": False})
                    continue
                source_language, target_language = start.sourceLanguage, start.targetLanguage
                chunker = SpeechChunker()
                await send({"type": "session.status", "status": "listening"})
            elif payload.get("type") == "target_language.changed":
                try:
                    target_language = TargetLanguageChangedEvent.model_validate(payload).targetLanguage
                except ValidationError as exc:
                    await send({"type": "error", "code": "invalid_target_language", "message": str(exc), "recoverable": True})
            elif payload.get("type") == "stop":
                if chunker is not None:
                    schedule_transcription(chunker.take())
                await send({"type": "session.status", "status": "stopped"})
                break
            else:
                await send({"type": "error", "code": "unknown_event", "message": "Unsupported live session event.", "recoverable": True})
    except WebSocketDisconnect:
        pass
    finally:
        for task in transcription_tasks | translation_tasks:
            task.cancel()
        await asyncio.gather(*transcription_tasks, *translation_tasks, return_exceptions=True)
