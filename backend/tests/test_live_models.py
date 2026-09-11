from pydantic import ValidationError
import pytest

from models.live import LiveStartEvent


def test_start_event_accepts_a_supported_source_language():
    event = LiveStartEvent.model_validate({"type": "start", "sourceLanguage": "id", "targetLanguage": "en"})

    assert event.sourceLanguage == "id"


def test_start_event_rejects_an_unsupported_target_language():
    with pytest.raises(ValidationError):
        LiveStartEvent.model_validate({"type": "start", "sourceLanguage": "de", "targetLanguage": "en"})


def test_start_event_rejects_an_unsupported_source_language():
    with pytest.raises(ValidationError):
        LiveStartEvent.model_validate({"type": "start", "sourceLanguage": "ja", "targetLanguage": "en"})
