from fastapi.testclient import TestClient


def test_health_endpoint():
    from main import app

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_live_session_starts_without_a_cloud_stt_key():
    from main import app

    with TestClient(app).websocket_connect("/api/live/session") as websocket:
        websocket.send_json({"type": "start", "sourceLanguage": "id", "targetLanguage": "en"})
        response = websocket.receive_json()

    assert response == {"type": "session.status", "status": "listening"}
