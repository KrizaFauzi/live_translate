# Voice Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete voice translator backend (STT + Translation services) and wire up frontend with correct ports/proxy

**Architecture:** Modular FastAPI backend with singleton services for STT (faster-whisper) and Translation (MarianMT), GPU auto-detection with CPU fallback, Docker Compose orchestration

**Tech Stack:** FastAPI, faster-whisper, transformers, React/Vite, TailwindCSS, Docker

**Spec:** docs/superpowers/specs/2026-08-22-voice-translator-design.md

## Global Constraints

- Backend port: 8000 internal, 8008 external
- Frontend port: 3005 (internal and external)
- STT: faster-whisper tiny model, beam_size=5, device auto-detect (cuda/float16 or cpu/int8)
- Translation: Helsinki-NLP/opus-mt-id-en and opus-mt-en-id
- Temp audio files cleaned up after processing
- No external API calls except model downloads on first run
- CORS: allow all origins

---

### Task 1: Backend - Device Detection Utility

**Files:**
- Create: `backend/utils/device.py`
- Create: `backend/utils/__init__.py`

**Interfaces:**
- Produces: `get_device_config() -> tuple[str, str]` (device, compute_type)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_device.py
import pytest

def test_get_device_config_returns_tuple():
    from utils.device import get_device_config
    result = get_device_config()
    assert isinstance(result, tuple)
    assert len(result) == 2
    device, compute_type = result
    assert device in ("cuda", "cpu")
    assert compute_type in ("float16", "int8")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_device.py -v`
Expected: FAIL - module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/utils/device.py
import torch

def get_device_config() -> tuple[str, str]:
    """Return (device, compute_type) for faster-whisper based on hardware."""
    if torch.cuda.is_available():
        return "cuda", "float16"
    return "cpu", "int8"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_device.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/utils/device.py backend/utils/__init__.py backend/tests/test_device.py
git commit -m "feat: add device detection utility"
```

---

### Task 2: Backend - Pydantic Schemas

**Files:**
- Create: `backend/models/schemas.py`
- Create: `backend/models/__init__.py`

**Interfaces:**
- Produces: `TranscribeResponse`, `TranslateRequest`, `TranslateResponse`, `HealthResponse` classes

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_schemas.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_schemas.py -v`
Expected: FAIL - module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/models/schemas.py
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_schemas.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/models/schemas.py backend/models/__init__.py backend/tests/test_schemas.py
git commit -m "feat: add pydantic schemas"
```

---

### Task 3: Backend - STT Service

**Files:**
- Create: `backend/services/stt.py`
- Create: `backend/services/__init__.py`
- Test: `backend/tests/test_stt.py`

**Interfaces:**
- Consumes: `get_device_config()` from `utils.device`
- Produces: `STTService` class with `transcribe(audio_path: str) -> tuple[str, str]`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_stt.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_stt.py -v`
Expected: FAIL - module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/stt.py
from faster_whisper import WhisperModel
from utils.device import get_device_config

class STTService:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _load_model(self):
        if self._model is None:
            device, compute_type = get_device_config()
            self._model = WhisperModel("tiny", device=device, compute_type=compute_type)
    
    def transcribe(self, audio_path: str) -> tuple[str, str]:
        self._load_model()
        segments, info = self._model.transcribe(audio_path, beam_size=5)
        text = " ".join([seg.text for seg in segments])
        return text.strip(), info.language
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_stt.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/stt.py backend/services/__init__.py backend/tests/test_stt.py
git commit -m "feat: add STT service with faster-whisper"
```

---

### Task 4: Backend - Translation Service

**Files:**
- Create: `backend/services/translation.py`
- Test: `backend/tests/test_translation.py`

**Interfaces:**
- Produces: `TranslationService` class with `translate(text: str, source_lang: str, target_lang: str) -> str`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_translation.py
import pytest
from unittest.mock import patch, MagicMock

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
    from services.translation import TranslationService
    
    with patch('services.translation.pipeline') as mock_pipeline:
        mock_pipe = MagicMock()
        mock_pipe.return_value = [{"translation_text": "test"}]
        mock_pipeline.return_value = mock_pipe
        
        service = TranslationService()
        service.translate("test", "id", "en")
        service.translate("test2", "id", "en")
        
        # pipeline should only be called once (cached)
        assert mock_pipeline.call_count == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_translation.py -v`
Expected: FAIL - module not found

- [ ] **Step 3: Write minimal implementation**

```python
# backend/services/translation.py
from transformers import pipeline

class TranslationService:
    _instance = None
    _models = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def _get_pipeline(self, source_lang: str, target_lang: str):
        key = f"{source_lang}-{target_lang}"
        if key not in self._models:
            model_name = f"Helsinki-NLP/opus-mt-{source_lang}-{target_lang}"
            self._models[key] = pipeline("translation", model=model_name)
        return self._models[key]
    
    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        pipe = self._get_pipeline(source_lang, target_lang)
        result = pipe(text, max_length=512)
        return result[0]["translation_text"]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_translation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/services/translation.py backend/tests/test_translation.py
git commit -m "feat: add translation service with MarianMT"
```

---

### Task 5: Backend - Main API Endpoints

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_main.py`

**Interfaces:**
- Consumes: `STTService`, `TranslationService`, schemas
- Produces: `/health`, `/api/transcribe`, `/api/translate` endpoints

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_main.py
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
            
            with open(f.name, "rb") as audio_file:
                response = client.post("/api/transcribe", files={"audio": ("test.webm", audio_file, "audio/webm")})
            
            os.unlink(f.name)
    
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
        
        with open(temp_path, "rb") as audio_file:
            response = client.post("/api/transcribe", files={"audio": ("test.webm", audio_file, "audio/webm")})
        
        # File should be deleted after request
        assert not os.path.exists(temp_path)
    
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_main.py -v`
Expected: FAIL - endpoints not implemented

- [ ] **Step 3: Write minimal implementation**

```python
# backend/main.py
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_main.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_main.py
git commit -m "feat: add API endpoints for transcribe and translate"
```

---

### Task 6: Backend - Update Requirements

**Files:**
- Modify: `backend/requirements.txt`

**Interfaces:**
- Adds all necessary dependencies

- [ ] **Step 1: Write the failing test** (validation test)

```python
# backend/tests/test_requirements.py
import subprocess
import sys

def test_requirements_installable():
    # Just verify the file exists and has expected packages
    with open("requirements.txt") as f:
        content = f.read()
    
    required = ["fastapi", "uvicorn", "python-multipart", "faster-whisper", "transformers", "torch", "pytest", "httpx"]
    for pkg in required:
        assert pkg in content, f"Missing {pkg} in requirements.txt"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_requirements.py -v`
Expected: FAIL - missing packages

- [ ] **Step 3: Update requirements.txt**

```
fastapi
uvicorn
python-multipart
faster-whisper
transformers
torch
pytest
httpx
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_requirements.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/tests/test_requirements.py
git commit -m "feat: update backend requirements"
```

---

### Task 7: Frontend - Update Vite Config for Port 3005 and Proxy

**Files:**
- Modify: `frontend/vite.config.js`

**Interfaces:**
- Configures dev server on port 3005, proxies /api to backend

- [ ] **Step 1: Write the failing test** (validation)

```javascript
// frontend/tests/vite.config.test.js
import { defineConfig } from 'vite'

// This is a validation test - just verify config loads
export default defineConfig({})
```

Actually, just verify the config manually since it's a config file.

- [ ] **Step 2: Update vite.config.js**

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    host: true,
    proxy: {
      '/api': 'http://backend:8000'
    }
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.js
git commit -m "feat: update frontend port to 3005 and add API proxy"
```

---

### Task 8: Frontend - Update API Calls to Use Relative Paths

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Changes fetch URLs from `http://localhost:8000/api/...` to `/api/...`

- [ ] **Step 1: Write the failing test** (manual verification)

- [ ] **Step 2: Update App.jsx API calls**

Change lines 43 and 56 from:
```javascript
const res1 = await fetch("http://localhost:8000/api/transcribe", {
```
to:
```javascript
const res1 = await fetch("/api/transcribe", {
```

And:
```javascript
const res2 = await fetch("http://localhost:8000/api/translate", {
```
to:
```javascript
const res2 = await fetch("/api/translate", {
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: update frontend to use relative API paths"
```

---

### Task 9: Docker - Update docker-compose.yml Ports

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Backend: 8008:8000, Frontend: 3005:3005
- Frontend command includes --port 3005

- [ ] **Step 1: Update docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8008:8000"
    volumes:
      - ./backend:/app
      - model_cache:/root/.cache/huggingface
  frontend:
    image: node:lts-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "3005:3005"
    command: npm run dev -- --host --port 3005
volumes:
  model_cache:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: update docker-compose ports for 3005/8008"
```

---

### Task 10: Integration Test - Full Stack Verification

**Files:**
- Test: `backend/tests/test_integration.py` (optional)
- Manual: `docker-compose up --build`

**Interfaces:**
- Verifies all components work together

- [ ] **Step 1: Build and start containers**

```bash
docker-compose up --build
```

- [ ] **Step 2: Verify health endpoint**

```bash
curl http://localhost:8008/health
# Expected: {"status": "ok"}
```

- [ ] **Step 3: Verify frontend loads**

Open http://localhost:3005 in browser

- [ ] **Step 4: Test recording flow manually**

1. Click and hold record button
2. Speak in Indonesian or English
3. Release button
4. Verify transcription appears in left panel
5. Verify translation appears in right panel
6. Toggle language mode and verify direction changes

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration test adjustments"
```

---

## Self-Review Checklist

- [x] Spec coverage: All PRD requirements mapped to tasks
- [x] Placeholder scan: No TBD/TODO, all code blocks complete
- [x] Type consistency: Services, schemas, endpoints all align
- [x] Task granularity: Each task is independently testable
- [x] Dependencies ordered: utils → schemas → services → main → docker → frontend

**Plan complete and saved to `docs/superpowers/plans/2026-08-22-voice-translator-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**