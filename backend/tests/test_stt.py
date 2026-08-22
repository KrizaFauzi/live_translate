import pytest
from unittest.mock import patch, MagicMock

def test_stt_service_singleton():
    from services.stt import STTService
    s1 = STTService()
    s2 = STTService()
    assert s1 is s2

def test_transcribe_returns_text_and_lang():
    from services.stt import STTService
    
    with patch('services.stt.WhisperModel') as mock_model_class:
        mock_model = MagicMock()
        mock_segment = MagicMock()
        mock_segment.text = "hello world"
        mock_model.transcribe.return_value = ([mock_segment], MagicMock(language="en"))
        mock_model_class.return_value = mock_model
        
        service = STTService()
        text, lang = service.transcribe("/fake/path.wav")
        
        assert text == "hello world"
        assert lang == "en"