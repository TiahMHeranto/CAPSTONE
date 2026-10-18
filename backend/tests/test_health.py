def test_health_ok(client, monkeypatch) -> None:
    monkeypatch.setattr("app.api.health.database_ok", lambda: True)
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["model_version"] == "v2"


def test_origine_distante_autorisee(client) -> None:
    response = client.options(
        "/health",
        headers={
            "Origin": "http://192.168.1.20:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


def test_health_unavailable_when_database_down(client, monkeypatch) -> None:
    monkeypatch.setattr("app.api.health.database_ok", lambda: False)
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"
