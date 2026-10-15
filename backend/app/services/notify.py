import json
import logging
import urllib.error
import urllib.request

from app.config import settings

logger = logging.getLogger(__name__)


def notifier(url: str, corps: dict) -> bool:
    if not url.startswith(("http://", "https://")):
        return False
    requete = urllib.request.Request(
        url,
        data=json.dumps(corps).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-Alert-Key": settings.admin_api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(requete, timeout=3) as reponse:
            return 200 <= reponse.status < 300
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        logger.warning("webhook n8n erreur=%s", type(exc).__name__)
        return False
