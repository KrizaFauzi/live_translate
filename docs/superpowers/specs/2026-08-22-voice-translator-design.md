# Voice Translator - Design Specification

## 1. Overview

Local, AI-powered web application for two-way audio translation between Indonesian (ID) and English (EN). All processing runs locally via Docker with open-source models — no data leaves the user's machine.

## 2. Architecture

### 2.1 System Components

```
┌─────────────────┐      HTTP POST       ┌────────────────────┐
│   Frontend      │ ──────────────────▶ │   Backend (FastAPI) │
│   (port 3005)   │                      │   (port 8008)       │
└─────────────────┘                      └────────────────────┘
        │                                        │
        │          POST /api/translate           │
        │ ──────────────────────────────────────▶│
        │                                        │
        │ ◀─────────────────────────────────────│ Translation result
        │                                        │
        │ ◀─────────────────────────────────────│ Transcription result
```

### 2.2 Backend Structure

```
backend/
├── main.py                 # FastAPI app, endpoints, CORS
├── services/
│   ├── __init__.py
│   ├── stt.py             # Speech-to-Text service (faster-whisper)
│   └── translation.py     # Translation service (MarianMT)
├── models/
│   └── schemas.py         # Pydantic request/response models
├── utils/
│   └── device.py          # GPU/CPU auto-detection
├── Dockerfile
├── requirements.txt
└── tests/
```

### 2.3 Frontend Structure

```
frontend/
├── src/
│   ├── App.jsx            # Main component (recording, UI, API calls)
│   ├── main.jsx           # Entry point
│   └── index.css          # Tailwind imports
├── index.html
├── package.json
├── vite.config.js         # Proxy config for /api → backend
├── tailwind.config.js
└── postcss.config.js
```

## 3. Backend Services

### 3.1 Device Detection (`utils/device.py`)

Auto-detects GPU availability and returns optimal config for faster-whisper:

```python
def get_device_config() -> tuple[str, str]:
    import torch
    if torch.cuda.is_available():
        return "cuda", "float16"
    return "cpu", "int8"
```

### 3.2 STT Service (`services/stt.py`)

Singleton service using faster-whisper tiny model:

- Lazy initialization on first request
- Uses device config from `utils/device.py`
- `transcribe(audio_path) -> (text, detected_language)`
- Beam size: 5 (per PRD)

### 3.3 Translation Service (`services/translation.py`)

Singleton service using Helsinki-NLP MarianMT models:

- Lazy loading per language pair
- Caches pipelines: "id-en" and "en-id"
- `translate(text, source_lang, target_lang) -> translated_text`
- Models: `opus-mt-id-en`, `opus-mt-en-id`

### 3.4 API Endpoints (`main.py`)

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/health` | GET | - | `{"status": "ok"}` |
| `/api/transcribe` | POST | `multipart/form-data` (audio file) | `{"original_text": "...", "detected_language": "id"\|"en"}` |
| `/api/translate` | POST | `{"text": "...", "source_lang": "id"\|"en", "target_lang": "id"\|"en"}` | `{"translated_text": "..."}` |

**Error handling:** 500 with `{"detail": "Error message"}`

**Temp file cleanup:** Automatic after transcription

### 3.5 Schemas (`models/schemas.py`)

Pydantic models for validation:

- `TranscribeResponse`: `original_text`, `detected_language`
- `TranslateRequest`: `text`, `source_lang`, `target_lang`
- `TranslateResponse`: `translated_text`
- `HealthResponse`: `status`

## 4. Frontend Implementation

### 4.1 Recording Flow (App.jsx)

1. Hold button → `navigator.mediaDevices.getUserMedia({audio: true})`
2. `MediaRecorder` captures chunks → `audio/webm` blob
3. Release → send to `/api/transcribe` via `FormData`
4. On success → display transcribed text, auto-call `/api/translate`
5. Display translation in right panel

### 4.2 Language Mode

- Two toggle buttons: "ID → EN" and "EN → ID"
- State: `mode` = "id-en" or "en-id"
- Determines `source_lang`/`target_lang` for translation

### 4.3 UI Layout

- Title: "Voice Translator"
- Two-panel grid: Original (left) / Translation (right)
- Large circular hold-to-record button with visual states
- Language toggles at top

### 4.4 API Calls

Uses relative `/api` paths (proxied by Vite to backend:8000)

## 5. Docker Configuration

### 5.1 docker-compose.yml

```yaml
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

### 5.2 Backend Dockerfile

```dockerfile
FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.3 Frontend Vite Config

```js
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

## 6. Requirements

### 6.1 Backend (requirements.txt)

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

Note: `torch` installs CPU version; faster-whisper's ctranslate2 detects CUDA automatically.

### 6.2 Frontend (package.json)

Dependencies: `react`, `react-dom`
DevDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`

## 7. Data Flow

1. User holds record button → MediaRecorder starts
2. User releases → audio blob assembled
3. POST `/api/transcribe` with audio file
4. Backend: saves to temp file → Whisper transcribes → returns text + detected language
5. Frontend: displays original text
6. Frontend: POST `/api/translate` with text + current mode languages
7. Backend: MarianMT translates → returns translated text
8. Frontend: displays translation in right panel
9. Temp audio file deleted

## 8. Non-Functional Requirements

- **Local-only:** No external API calls except model downloads on first run
- **GPU support:** Auto-detect CUDA, use float16; fallback to CPU int8
- **Performance:** Transcription < 10s for 10s clips, Translation < 5s
- **Cleanup:** Temp files removed after processing
- **Ports:** Frontend 3005, Backend 8008 (external)

## 9. Acceptance Criteria

- [ ] `docker-compose up --build` succeeds
- [ ] Frontend accessible at http://localhost:3005
- [ ] Backend health at http://localhost:8008/health returns `{"status": "ok"}`
- [ ] Record audio → see transcribed text
- [ ] Translate transcribed text to opposite language
- [ ] Language mode toggle works (ID↔EN)
- [ ] Temp files cleaned up
- [ ] No console errors during normal use