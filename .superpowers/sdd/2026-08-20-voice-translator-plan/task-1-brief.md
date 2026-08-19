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
git add docker-compose.yml backend/
git commit -m "chore: initial backend and docker setup"
```
