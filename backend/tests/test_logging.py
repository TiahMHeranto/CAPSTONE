import json
import logging

from app.core.logging import JsonFormatter


def test_journal_json_porte_l_heure_et_la_requete() -> None:
    enregistrement = logging.LogRecord(
        name="prediccare.http",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="requete",
        args=(),
        exc_info=None,
    )
    enregistrement.method = "GET"
    enregistrement.path = "/health"
    enregistrement.status = 200
    enregistrement.duree_ms = 4
    corps = json.loads(JsonFormatter().format(enregistrement))
    assert corps["message"] == "requete"
    assert corps["path"] == "/health"
    assert corps["status"] == 200
    assert "T" in corps["ts"]
