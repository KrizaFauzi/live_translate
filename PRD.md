# Product Requirements Document: Voice Translator

> **Cloud-first architecture note (2026-09-11):** This note supersedes earlier local-model requirements. Browser PCM streams directly to Gemini Live with a short-lived constrained token issued by the backend. The backend retains the permanent Gemini key and translates finalized text; it does not relay or store microphone audio.

> **Live Mode addendum (September 2026):** Alongside the existing local-only Private Mode, the app now supports an opt-in cloud Live Mode. It streams microphone PCM to a server-side speech-to-text provider with automatic source-language detection, renders interim source text, and translates finalized segments into a language selected from a dropdown. The provider API key remains on the backend; Live Mode clearly discloses that audio leaves the device. Private Mode retains its local Whisper + MarianMT flow.

## 1. Product Vision
A local, AI-powered web application for two-way audio translation between Indonesian (ID) and English (EN). All processing runs locally via Docker with open-source models — no data leaves the user's machine.

## 2. Problem Statement
Users need a simple, private way to translate spoken audio between Indonesian and English. Existing solutions either send data to the cloud (privacy concern) or require technical expertise to set up locally.

## 3. Goals & Success Metrics

### Primary Goals
- [ ] Enable audio recording via browser microphone
- [ ] Transcribe speech to text using Whisper (faster-whisper)
- [ ] Translate text between ID and EN using MarianMT
- [ ] Display original and translated text side-by-side
- [ ] Run entirely locally in Docker with no cloud dependency

### Success Metrics
- Audio transcription latency < 10 seconds for 10-second clips
- Translation latency < 5 seconds
- Speech recognition accuracy > 85% for clear audio
- Zero data transmission to external services

## 4. User Stories

| ID | User Story | Priority |
|----|-----------|----------|
| US-01 | As a user, I can hold a button to record my voice and release to get transcription | High |
| US-02 | As a user, I see my original text appear immediately after transcription | High |
| US-03 | As a user, I can translate the transcribed text to the opposite language (ID↔EN) | High |
| US-04 | As a user, I see the translated text appear below the original | High |
| US-05 | As a user, I can switch between ID→EN and EN→ID translation modes | Medium |
| US-06 | As a user, all processing happens locally without data leaving my machine | High (privacy) |

## 5. Functional Requirements

### FR-1: Audio Recording
- Frontend must use `MediaRecorder` API
- Recording via hold-to-talk interaction (mouse down = record, release = process)
- Audio format: webm/mp3 blob

### FR-2: Speech-to-Text (STT)
- Backend endpoint `POST /api/transcribe`
- Accepts multipart/form-data with audio file
- Returns JSON: `{"original_text": "...", "detected_language": "id"/"en"}`
- Uses `faster-whisper` tiny model on CPU

### FR-3: Text Translation
- Backend endpoint `POST /api/translate`
- Accepts JSON: `{"text": "...", "source_lang": "id"/"en", "target_lang": "id"/"en"}`
- Returns JSON: `{"translated_text": "..."}`
- Uses Helsinki-NLP MarianMT models: `opus-mt-id-en` and `opus-mt-en-id`

### FR-4: Language Mode Toggle
- Two buttons: "ID → EN" and "EN → ID"
- Current mode determines translation direction
- Visual indication of active mode

### FR-5: UI Layout
- Page title: "Voice Translator"
- Two-panel layout: Original text (left) and Translation (right)
- Recording button: large circular button that shows recording state
- Language mode switches at top

## 6. Non-Functional Requirements

### NF-1: Local-Only Processing
- No external API calls except model downloads on first run
- All AI models run locally in backend container
- No cloud storage or database

### NF-2: Docker Deployment
- Two-container setup: frontend (Node/Vite) and backend (Python/FastAPI)
- Backend must include ffmpeg for audio preprocessing
- Models cached in Docker volume across restarts

### NF-3: Performance
- Transcription: model "tiny", beam_size=5
- Translation: direct pipeline with no beam search
- Total end-to-end: < 15 seconds for typical 5-10 second audio clips

### NF-4: Error Handling
- Graceful handling of microphone permissions denied
- Error messages displayed if transcription/translation fails
- Temporary audio files cleaned up after processing

## 7. API Specification

### Endpoint: POST /api/transcribe
```
Request: multipart/form-data
  - audio: file (audio/webm or audio/wav)

Response (200):
{
  "original_text": "Transcribed text",
  "detected_language": "id" | "en"
}

Error (500):
{
  "detail": "Error message"
}
```

### Endpoint: POST /api/translate
```
Request: application/json
{
  "text": "Text to translate",
  "source_lang": "id" | "en",
  "target_lang": "id" | "en"
}

Response (200):
{
  "translated_text": "Terjemahan atau translated text"
}

Error (500):
{
  "detail": "Error message"
}
```

### Endpoint: GET /health
```
Response (200):
{
  "status": "ok"
}
```

## 8. Technical Specifications

### Stack
- **Frontend:** React 18, Vite, TailwindCSS
- **Backend:** Python 3.10, FastAPI, Uvicorn
- **STT:** faster-whisper (tiny model, int8 compute_type)
- **Translation:** transformers pipeline with Helsinki-NLP/opus-mt-id-en and opus-mt-en-id
- **Containerization:** Docker + Docker Compose (2 services)
- **Audio:** MediaRecorder API, ffmpeg (backend)

### Architecture
```
┌─────────────────┐      HTTP POST       ┌────────────────────┐
│   Frontend      │ ──────────────────▶ │   Backend (FastAPI) │
│   (port 5173)   │                      │   (port 8000)       │
└─────────────────┘                      └────────────────────┘
        │                                        │
        │          POST /api/translate           │
        │ ──────────────────────────────────────▶│
        │                                        │
        │ ◀─────────────────────────────────────│ Translation result
        │                                        │
        │ ◀─────────────────────────────────────│ Transcription result
```

### Models
- `faster-whisper/tiny` - STT model, ~39MB, fast CPU inference
- `Helsinki-NLP/opus-mt-id-en` - ID→EN translation
- `Helsinki-NLP/opus-mt-en-id` - EN→ID translation

### Data Flow
1. User records audio → MediaRecorder captures audio chunks
2. Chunks assembled into blob → sent to `/api/transcribe`
3. Backend runs Whisper → returns transcribed text + detected language
4. Frontend automatically sends text to `/api/translate` with current mode
5. Backend runs MarianMT → returns translated text
6. Both texts displayed in dual-panel UI

## 9. Constraints & Boundaries

### What's NOT Included (Out of Scope)
- [ ] No WebSocket usage (using REST API only, per design spec)
- [ ] No user authentication or accounts
- [ ] No conversation history persistence
- [ ] No language detection beyond Whisper's output
- [ ] No model selection UI (fixed tiny model, fixed MarianMT models)
- [ ] No offline-first model packing (models downloaded on first run)

### Technical Constraints
- Backend must run on port 8000
- Frontend must run on port 5173
- Models stored in HuggingFace cache volume
- Audio processed as WebM/MP3 blobs only

## 10. Future Considerations (Post-MVP)

| Priority | Feature |
|----------|---------|
| Low | Support additional language pairs (JV, KO, etc.) |
| Low | Batch processing of longer audio files |
| Low | Playback of original and translated audio |
| Low | Adjustable model selection (tiny, base, small) |
| Low | User preferences (default language mode, auto-start) |
| Medium | Web Worker for AI processing to avoid UI blocking |
| Medium | Model caching strategy for faster restarts |

## 11. Acceptance Criteria

The feature is complete when:
- [ ] Docker containers build and run successfully with `docker-compose up --build`
- [ ] Frontend accessible at http://localhost:5173
- [ ] Backend health endpoint returns `{"status": "ok"}` at http://localhost:8000/health
- [ ] User can record audio and see transcribed text
- [ ] User can translate transcribed text to the opposite language
- [ ] Language mode toggle works correctly (ID↔EN)
- [ ] Temporary audio files are cleaned up after processing
- [ ] No errors in console when using the application normally
