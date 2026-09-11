"""Cloud provider services used by the API."""

from .libretranslate import LibreTranslateService
from .whisper_cpp import WhisperCppService

__all__ = ["LibreTranslateService", "WhisperCppService"]
