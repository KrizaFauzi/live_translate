from models.schemas import TranscribeResponse, TranslateRequest, TranslateResponse, HealthResponse

def test_transcribe_response():
    r = TranscribeResponse(original_text="hello", detected_language="en")
    assert r.original_text == "hello"
    assert r.detected_language == "en"

def test_translate_request():
    r = TranslateRequest(text="hello", source_lang="en", target_lang="id")
    assert r.text == "hello"
    assert r.source_lang == "en"
    assert r.target_lang == "id"

def test_translate_response():
    r = TranslateResponse(translated_text="halo")
    assert r.translated_text == "halo"

def test_health_response():
    r = HealthResponse()
    assert r.status == "ok"