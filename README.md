# Live Translate

> Live Indonesian ↔ English transcription and translation from your browser microphone.

[![Docker Compose](https://img.shields.io/badge/run-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![Deepgram](https://img.shields.io/badge/STT-Deepgram%20Nova--3-13EF93?logo=deepgram&logoColor=111827)](https://deepgram.com/)
[![LibreTranslate](https://img.shields.io/badge/translation-LibreTranslate-4B8BBE)](https://libretranslate.com/)

## What it does

- Captures microphone audio in the browser.
- Streams audio to Deepgram Nova-3 for live speech-to-text.
- Translates finalized transcript segments locally with LibreTranslate.
- Lets the user choose Indonesian or English as source and target languages.

## Architecture

```text
┌──────────────┐     PCM 16 kHz      ┌──────────────┐    secure stream    ┌────────────────┐
│ React browser│ ──────────────────► │ FastAPI relay│ ─────────────────► │ Deepgram Nova-3│
│ microphone   │ ◄── WebSocket text ─│              │                    │ live STT       │
└──────────────┘                     └──────┬───────┘                    └────────────────┘
                                              │ finalized transcript
                                              ▼
                                       ┌───────────────┐
                                       │LibreTranslate │
                                       │ local text MT │
                                       └───────────────┘
```

The permanent Deepgram key remains on the backend. The browser only communicates with this application's WebSocket endpoint.

## Quick start

### Prerequisites

- Docker Desktop running
- A Deepgram API key
- A current Chrome or Edge browser for microphone access

### 1. Create `.env`

```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your key:

```env
DEEPGRAM_API_KEY=your_deepgram_key
```

`LIBRETRANSLATE_URL` can normally be left at its default Docker-internal address.

### 2. Start the stack

```powershell
docker compose up --build
```

Open [http://localhost:3005](http://localhost:3005), select a source and target language, then press **Start listening**.

> LibreTranslate downloads its Indonesian/English models during its first start. The models are stored in a named Docker volume and reused on later starts.

## Service endpoints

| Service | Local address | Purpose |
| --- | --- | --- |
| Frontend | `http://localhost:3005` | Browser interface |
| Backend | `http://localhost:8008/health` | API health check |
| Deepgram | Cloud service | Live speech-to-text |
| LibreTranslate | Docker-internal `http://libretranslate:5000` | Local text translation |

## Useful commands

```powershell
# Start in the background
docker compose up --build -d

# Inspect service logs
docker compose logs -f backend libretranslate

# Stop services while preserving translation models
docker compose down

# Backend tests
Set-Location backend
$env:PYTHONPATH = (Get-Location).Path
pytest -q -p no:cacheprovider

# Frontend checks
Set-Location ../frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Branches

| Branch | Speech-to-text | Translation | Best for |
| --- | --- | --- | --- |
| `master` | Deepgram Nova-3 | Local LibreTranslate | Low-latency live transcription |
| [`kriza/whisper_cpp`](https://github.com/KrizaFauzi/live_translate/tree/kriza/whisper_cpp) | Local whisper.cpp | Local LibreTranslate | A no-API-cost STT experiment |

## Privacy and cost

Audio is processed by Deepgram when using `master`; the translation layer stays local in Docker. Deepgram is usage-based, so monitor its credit balance and Auto-Load settings in the Deepgram console. LibreTranslate requires no translation API key in this setup.

## Project status

`master` is the recommended branch for the current live experience. The `kriza/whisper_cpp` branch explores fully local speech-to-text, with the trade-off of a larger model download and higher local CPU/RAM use.
