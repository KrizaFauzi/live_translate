# Live Translate

> Real-time Indonesian ↔ English transcription and translation from your browser microphone.

[![Docker Compose](https://img.shields.io/badge/run-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![whisper.cpp](https://img.shields.io/badge/STT-whisper.cpp-111827)](https://github.com/ggml-org/whisper.cpp)
[![LibreTranslate](https://img.shields.io/badge/translation-LibreTranslate-4B8BBE)](https://libretranslate.com/)

## What it does

- Captures microphone audio in the browser.
- Turns speech into text, then translates each completed sentence.
- Lets the user choose Indonesian or English as both source and target language.
- Keeps audio processing and translation inside Docker on the `kriza/whisper_cpp` branch.

## Choose a branch

| Branch | Speech-to-text | Translation | API key | Best for |
| --- | --- | --- | --- | --- |
| [`master`](https://github.com/KrizaFauzi/live_translate/tree/master) | Deepgram Nova-3 | Self-hosted LibreTranslate | `DEEPGRAM_API_KEY` | Low-latency cloud STT and a fast prototype |
| [`kriza/whisper_cpp`](https://github.com/KrizaFauzi/live_translate/tree/kriza/whisper_cpp) | Local whisper.cpp | Self-hosted LibreTranslate | None | Trying an offline, no-per-minute-cost stack |

This README describes the current `kriza/whisper_cpp` branch.

## Architecture

```text
┌──────────────┐     PCM 16 kHz      ┌──────────────┐     WAV segments     ┌───────────────┐
│ React browser│ ──────────────────► │ FastAPI relay│ ───────────────────► │  whisper.cpp  │
│ microphone   │ ◄── WebSocket text ─│  + pause VAD │                     │ local STT     │
└──────────────┘                     └──────┬───────┘                     └───────────────┘
                                              │ finalized text
                                              ▼
                                       ┌───────────────┐
                                       │LibreTranslate │
                                       │ local text MT │
                                       └───────────────┘
```

The backend detects roughly 700 ms of silence, then sends that utterance to whisper.cpp. This is intentionally **sentence-by-sentence**, rather than the word-level partial streaming supplied by Deepgram.

## Quick start

### Prerequisites

- Docker Desktop running
- A current Chrome or Edge browser for microphone access

### 1. Create local environment settings

```powershell
Copy-Item .env.example .env
```

The local whisper.cpp branch needs no paid API key. The default internal Docker URLs in `.env.example` can usually be left unchanged.

### 2. Start the stack

```powershell
docker compose up --build
```

Then open [http://localhost:3005](http://localhost:3005).

> The first start downloads the whisper.cpp image, the multilingual `base` model, and the Indonesian/English LibreTranslate models. Keep the named Docker volumes: later starts reuse those downloads.

### 3. Use it

1. Choose **Speak in** and **Translate to**.
2. Press **Start listening** and allow microphone access.
3. Pause briefly after a sentence; the source transcript and translation will appear together.

## Service endpoints

| Service | Local address | Purpose |
| --- | --- | --- |
| Frontend | `http://localhost:3005` | Browser interface |
| Backend | `http://localhost:8008/health` | API health check |
| whisper.cpp | Docker-internal `http://whispercpp:8080` | Local speech recognition |
| LibreTranslate | Docker-internal `http://libretranslate:5000` | Local text translation |

## Useful commands

```powershell
# Start in the background
docker compose up --build -d

# Inspect startup/model-download logs
docker compose logs -f whispercpp libretranslate backend

# Stop services while preserving downloaded models
docker compose down

# Run backend tests
Set-Location backend
$env:PYTHONPATH = (Get-Location).Path
pytest -q -p no:cacheprovider

# Run frontend checks
Set-Location ../frontend
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

## Trade-offs

| Local whisper.cpp | Deepgram on `master` |
| --- | --- |
| No speech API bill and no cloud audio upload | Lower-latency partial transcripts |
| Large first download and meaningful CPU/RAM use | Requires a Deepgram key and consumes credits |
| Text appears after a speaking pause | Text can update while someone is speaking |

For a development machine or a private demo, the local branch is a useful cost-free experiment. For production real-time captions, benchmark your target hardware before choosing it.

## Privacy

On `kriza/whisper_cpp`, microphone audio is sent only from the browser to the local Docker stack. No Deepgram, OpenAI, or other cloud AI key is used. LibreTranslate and whisper.cpp process the audio/text locally.

## Project status

The `kriza/whisper_cpp` branch is an experiment focused on validating local STT latency and accuracy. `master` remains the stable cloud-STT alternative.
