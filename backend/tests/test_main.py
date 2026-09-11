from fastapi.testclient import TestClient


def test_health_endpoint():
    from main import app

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_live_session_requires_a_deepgram_key(monkeypatch):
    monkeypatch.delenv("DEEPGRAM_API_KEY", raising=False)
    from main import app

    with TestClient(app).websocket_connect("/api/live/session") as websocket:
        websocket.send_json({"type": "start", "sourceLanguage": "id", "targetLanguage": "en"})
        websocket.receive_json()
        response = websocket.receive_json()

    assert response["type"] == "error"
    assert response["code"] == "live_mode_unavailable"
    assert "DEEPGRAM_API_KEY" in response["message"]
