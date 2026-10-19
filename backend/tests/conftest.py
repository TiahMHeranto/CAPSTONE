import os

os.environ["RAG_INDEX_AU_DEMARRAGE"] = "0"

import pytest
from fastapi.testclient import TestClient

from app.core.tokens import emettre
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def entete():
    def _entete(
        role: str = "prestataire",
        identifiant: str | None = None,
        assure_id: str | None = None,
    ) -> dict[str, str]:
        return {"Authorization": f"Bearer {emettre(identifiant or role, role, assure_id)}"}

    return _entete
