def test_health_ok(client, monkeypatch) -> None:
    monkeypatch.setattr("app.api.health.database_ok", lambda: True)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["model_version"] == "mock-0.1"


def test_health_unavailable_when_database_down(client, monkeypatch) -> None:
    monkeypatch.setattr("app.api.health.database_ok", lambda: False)
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"
