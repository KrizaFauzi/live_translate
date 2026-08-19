# Voice Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 2-container web app that records audio, transcribes it, and translates it (ID <-> EN) using local AI models via REST APIs.

**Architecture:** React (Vite) frontend and Python FastAPI backend orchestrated by Docker Compose.

**Tech Stack:** React, TailwindCSS, FastAPI, faster-whisper, transformers (MarianMT), Docker.

**Spec:** docs/superpowers/specs/2026-08-20-voice-translator-design.md

## Global Constraints
- Frontend runs on port 5173.
- Backend runs on port 8000.
- All AI models run locally inside the backend container.
- Two-step API process for UX: `/api/transcribe` then `/api/translate`.

---

### Task 1: Docker Infrastructure & Backend Scaffolding

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/main.py`
- Create: `backend/tests/test_main.py`

**Interfaces:**
- Produces: A running FastAPI container exposing port 8000 with a `/health` endpoint.

- [ ] **Step 1: Create requirements.txt**
```text
fastapi
uvicorn
python-multipart
faster-whisper
transformers
torch
pytest
httpx
```

- [ ] **Step 2: Create backend/Dockerfile**
```dockerfile
FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create docker-compose.yml**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
      - model_cache:/root/.cache/huggingface
  frontend:
    image: node:lts-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: npm run dev -- --host
volumes:
  model_cache:
```

- [ ] **Step 4: Write failing test for health endpoint**
`backend/tests/test_main.py`:
```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 5: Write minimal implementation for backend/main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests to verify**
Run: `docker-compose run --rm backend pytest tests/test_main.py -v`
Expected: PASS

- [ ] **Step 7: Commit**
```bash
git init
git add docker-compose.yml backend/
git commit -m "chore: initial backend and docker setup"
```

### Task 2: AI Pipeline & API Endpoints

**Files:**
- Create: `backend/ai_pipeline.py`
- Modify: `backend/main.py`

**Interfaces:**
- Produces: `POST /api/transcribe` (multipart audio -> text) and `POST /api/translate` (json text -> translated text).

- [ ] **Step 1: Write AI Pipeline wrapper (`backend/ai_pipeline.py`)**
```python
from faster_whisper import WhisperModel
from transformers import pipeline

whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
# Helsinki-NLP models for ID <-> EN
translator_id_en = pipeline("translation", model="Helsinki-NLP/opus-mt-id-en")
translator_en_id = pipeline("translation", model="Helsinki-NLP/opus-mt-en-id")

def transcribe_audio(file_path: str) -> dict:
    segments, info = whisper_model.transcribe(file_path, beam_size=5)
    text = " ".join([segment.text for segment in segments])
    return {"text": text.strip(), "language": info.language}

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    if source_lang == "id" and target_lang == "en":
        result = translator_id_en(text)
        return result[0]['translation_text']
    elif source_lang == "en" and target_lang == "id":
        result = translator_en_id(text)
        return result[0]['translation_text']
    return text
```

- [ ] **Step 2: Add Endpoints in `backend/main.py`**
```python
import os
import shutil
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from ai_pipeline import transcribe_audio, translate_text

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class TranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str

@app.post("/api/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    file_location = f"temp_{audio.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    
    result = transcribe_audio(file_location)
    os.remove(file_location)
    return {"original_text": result["text"], "detected_language": result["language"]}

@app.post("/api/translate")
def translate(req: TranslateRequest):
    translated = translate_text(req.text, req.source_lang, req.target_lang)
    return {"translated_text": translated}
```

- [ ] **Step 3: Commit**
```bash
git add backend/
git commit -m "feat: add transcription and translation endpoints"
```

### Task 3: Frontend Scaffolding

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`

**Interfaces:**
- Produces: Running Vite React app.

- [ ] **Step 1: Write frontend/package.json**
```json
{
  "name": "voice-translator-ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Write frontend/vite.config.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
```

- [ ] **Step 3: Write frontend/index.html**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Voice Translator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write frontend/src/main.jsx**
```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: Setup Tailwind (`frontend/tailwind.config.js` and `frontend/postcss.config.js` and `frontend/src/index.css`)**

`frontend/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

`frontend/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Install dependencies & run**
Run: `docker-compose run --rm frontend npm install`
Expected: Node modules installed.

- [ ] **Step 7: Commit**
```bash
git add frontend/
git commit -m "chore: scaffold react frontend with tailwind"
```

### Task 4: Frontend App UI & Logic

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `/api/transcribe` and `/api/translate`

- [ ] **Step 1: Write `frontend/src/App.jsx`**
```javascript
import { useState, useRef } from 'react'

export default function App() {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState("id-en"); // "id-en" or "en-id"
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = processAudio;
    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setSourceText("Listening...");
    setTargetText("");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");

    setSourceText("Processing speech...");

    try {
      // Step 1: Transcribe
      const res1 = await fetch("http://localhost:8000/api/transcribe", {
        method: "POST",
        body: formData
      });
      const data1 = await res1.json();
      const transcribed = data1.original_text;
      setSourceText(transcribed);

      // Step 2: Translate
      setTargetText("Translating...");
      const srcLang = mode === "id-en" ? "id" : "en";
      const tgtLang = mode === "id-en" ? "en" : "id";
      
      const res2 = await fetch("http://localhost:8000/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcribed, source_lang: srcLang, target_lang: tgtLang })
      });
      const data2 = await res2.json();
      setTargetText(data2.translated_text);

    } catch (err) {
      console.error(err);
      setSourceText("Error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">Voice Translator</h1>
        
        <div className="flex justify-center gap-4">
          <button 
            className={`px-4 py-2 rounded ${mode === 'id-en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('id-en')}>ID -> EN</button>
          <button 
            className={`px-4 py-2 rounded ${mode === 'en-id' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMode('en-id')}>EN -> ID</button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            <h2 className="text-sm text-gray-500 mb-2">Original Text ({mode.split('-')[0].toUpperCase()})</h2>
            <p className="text-lg">{sourceText}</p>
          </div>
          <div className="bg-white p-6 rounded shadow min-h-[200px]">
            <h2 className="text-sm text-gray-500 mb-2">Translation ({mode.split('-')[1].toUpperCase()})</h2>
            <p className="text-lg">{targetText}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            className={`w-32 h-32 rounded-full text-white font-bold text-xl transition-all ${isRecording ? 'bg-red-600 scale-110' : 'bg-blue-500 hover:bg-blue-600'}`}
          >
            {isRecording ? 'Release' : 'Hold'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/App.jsx
git commit -m "feat: implement recording, transcription, and translation UI"
```
