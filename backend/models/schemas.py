from pydantic import BaseModel

class TranscribeResponse(BaseModel):
    original_text: str
    detected_language: str

class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

class TranslateResponse(BaseModel):
    translated_text: str

class HealthResponse(BaseModel):
    status: str = "ok"