from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os

from services.stt import STTService
from services.translation import TranslationService
from models.schemas import TranscribeResponse, TranslateRequest, TranslateResponse, HealthResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stt_service = STTService()
translation_service = TranslationService()

@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}

@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe(audio: UploadFile = File(...)):
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        text, lang = stt_service.transcribe(tmp_path)
        return {"original_text": text, "detected_language": lang}
    finally:
        os.unlink(tmp_path)

@app.post("/api/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    text = translation_service.translate(req.text, req.source_lang, req.target_lang)
    return {"translated_text": text}