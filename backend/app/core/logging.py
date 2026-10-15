import json
import logging
from datetime import datetime, timezone

from app.config import settings

_EXTRAS = ("error_type", "method", "path", "status", "duree_ms")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        moment = datetime.fromtimestamp(record.created, timezone.utc)
        payload = {
            "ts": moment.isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for champ in _EXTRAS:
            if champ in record.__dict__:
                payload[champ] = record.__dict__[champ]
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(settings.log_level)
