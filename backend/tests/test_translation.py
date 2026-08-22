import pytest
from unittest.mock import patch, MagicMock
import sys

def test_translation_service_singleton():
    from services.translation import TranslationService
    s1 = TranslationService()
    s2 = TranslationService()
    assert s1 is s2

def test_translate_id_to_en():
    from services.translation import TranslationService
    
    with patch('services.translation.pipeline') as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"translation_text": "hello world"}]
        mock_pipeline.return_value = mock_pipe
        
        service = TranslationService()
        result = service.translate("halo dunia", "id", "en")
        
        assert result == "hello world"
        mock_pipeline.assert_called_with("translation", model="Helsinki-NLP/opus-mt-id-en")

def test_translate_en_to_id():
    from services.translation import TranslationService
    
    with patch('services.translation.pipeline') as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"translation_text": "halo dunia"}]
        mock_pipeline.return_value = mock_pipe
        
        service = TranslationService()
        result = service.translate("hello world", "en", "id")
        
        assert result == "halo dunia"
        mock_pipeline.assert_called_with("translation", model="Helsinki-NLP/opus-mt-en-id")

def test_pipeline_cached():
    # Patch before importing the module
    with patch('transformers.pipeline') as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"translation_text": "test"}]
        mock_pipeline.return_value = mock_pipe
        
        # Remove module from cache if already imported
        if 'services.translation' in sys.modules:
            del sys.modules['services.translation']
        
        from services.translation import TranslationService
        service = TranslationService()
        service.translate("test", "id", "en")
        service.translate("test2", "id", "en")
        
        # pipeline should only be called once (cached)
        assert mock_pipeline.call_count == 1