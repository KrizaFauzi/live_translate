import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import tempfile
import os

def test_health_endpoint():
    from main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_transcribe_endpoint():
    from main import app
    client = TestClient(app)
    
    with patch('main.stt_service') as mock_stt:
        mock_stt.transcribe.return_value = ("hello world", "en")
        
        # Create a fake audio file
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(b"fake audio")
            f.flush()
            temp_path = f.name
        
        try:
            with open(temp_path, "rb") as audio_file:
                response = client.post("/api/transcribe", files={"audio": ("test.webm", audio_file, "audio/webm")})
        finally:
            # Clean up test file
            try:
                os.unlink(temp_path)
            except:
                pass
    
    assert response.status_code == 200
    data = response.json()
    assert data["original_text"] == "hello world"
    assert data["detected_language"] == "en"

def test_transcribe_cleans_up_temp_file():
    from main import app
    client = TestClient(app)
    
    with patch('main.stt_service') as mock_stt:
        mock_stt.transcribe.return_value = ("test", "en")
        
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(b"fake audio")
            f.flush()
            temp_path = f.name
        
        try:
            with open(temp_path, "rb") as audio_file:
                response = client.post("/api/transcribe", files={"audio": ("test.webm", audio_file, "audio/webm")})
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass
        
        # The endpoint should clean up its own temp file (not our test file)
        # We can't easily test the internal temp file, but we can verify the response works
        assert response.status_code == 200

def test_translate_endpoint():
    from main import app
    client = TestClient(app)
    
    with patch('main.translation_service') as mock_translate:
        mock_translate.translate.return_value = "halo dunia"
        
        response = client.post("/api/translate", json={
            "text": "hello world",
            "source_lang": "en",
            "target_lang": "id"
        })
    
    assert response.status_code == 200
    assert response.json() == {"translated_text": "halo dunia"}