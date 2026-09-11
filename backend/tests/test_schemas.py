from models.schemas import HealthResponse

def test_health_response():
    r = HealthResponse()
    assert r.status == "ok"
