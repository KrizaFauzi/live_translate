"""Contracts shared by the live WebSocket endpoint and its provider services."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


SourceLanguage = Literal["id", "en"]
TargetLanguage = Literal["id", "en"]

SOURCE_LANGUAGES: dict[str, str] = {
    "id": "Indonesian",
    "en": "English",
}

class LiveStartEvent(BaseModel):
    type: Literal["start"]
    sourceLanguage: SourceLanguage
    targetLanguage: TargetLanguage


class TargetLanguageChangedEvent(BaseModel):
    type: Literal["target_language.changed"]
    targetLanguage: TargetLanguage


class LiveStopEvent(BaseModel):
    type: Literal["stop"]


class SessionStatusEvent(BaseModel):
    type: Literal["session.status"] = "session.status"
    status: Literal["connecting", "listening", "reconnecting", "stopped"]


class TranscriptPartialEvent(BaseModel):
    type: Literal["transcript.partial"] = "transcript.partial"
    text: str


class TranscriptFinalEvent(BaseModel):
    type: Literal["transcript.final"] = "transcript.final"
    segmentId: str
    text: str
    detectedLanguage: str | None = None


class TranslationPendingEvent(BaseModel):
    type: Literal["translation.pending"] = "translation.pending"
    segmentId: str
    targetLanguage: TargetLanguage


class TranslationFinalEvent(BaseModel):
    type: Literal["translation.final"] = "translation.final"
    segmentId: str
    text: str
    targetLanguage: TargetLanguage


class LiveErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    code: str
    message: str
    recoverable: bool = False


class LiveProviderTranscript(BaseModel):
    """Provider-neutral transcript message used internally by the relay."""

    text: str = Field(min_length=1)
    is_final: bool
    detected_language: str | None = None
