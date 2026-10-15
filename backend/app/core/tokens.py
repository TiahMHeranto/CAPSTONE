import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from app.config import settings

ROLES = frozenset({"prestataire", "assure", "gestionnaire", "administrateur"})
DUREE_SESSION_S = 8 * 3600
_ITERATIONS = 200_000


@dataclass(frozen=True)
class Principal:
    identifiant: str
    role: str
    assure_id: str | None


class AccesRefuse(Exception):
    def __init__(self, status: int, code: str, motif: str) -> None:
        self.status = status
        self.code = code
        self.motif = motif


def hacher(mot: str) -> str:
    import secrets

    sel = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", mot.encode("utf-8"), sel, _ITERATIONS)
    return f"pbkdf2${_ITERATIONS}${sel.hex()}${digest.hex()}"


def verifier(mot: str, stocke: str) -> bool:
    try:
        _algo, iterations, sel, digest = stocke.split("$")
        calcul = hashlib.pbkdf2_hmac(
            "sha256", mot.encode("utf-8"), bytes.fromhex(sel), int(iterations)
        )
        return hmac.compare_digest(calcul.hex(), digest)
    except (ValueError, TypeError):
        return False


def emettre(
    identifiant: str,
    role: str,
    assure_id: str | None,
    duree_s: int = DUREE_SESSION_S,
) -> str:
    if role not in ROLES:
        raise ValueError("role inconnu")
    corps = {
        "sub": identifiant,
        "role": role,
        "assure": assure_id,
        "exp": int(time.time()) + duree_s,
    }
    brut = base64.urlsafe_b64encode(json.dumps(corps, separators=(",", ":")).encode()).decode()
    brut = brut.rstrip("=")
    signature = hmac.new(
        settings.auth_token_secret.encode("utf-8"), brut.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{brut}.{signature}"


def lire_jeton(authorization: str | None) -> Principal | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    jeton = authorization.removeprefix("Bearer ").strip()
    if jeton.count(".") != 1:
        return None
    brut, signature = jeton.split(".", 1)
    attendue = hmac.new(
        settings.auth_token_secret.encode("utf-8"), brut.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if len(signature) != len(attendue) or not hmac.compare_digest(signature, attendue):
        return None
    try:
        corps = json.loads(base64.urlsafe_b64decode(brut + "=" * (-len(brut) % 4)))
        if int(corps.get("exp", 0)) < time.time():
            return None
        role = corps.get("role")
        if role not in ROLES or not corps.get("sub"):
            return None
    except (ValueError, json.JSONDecodeError, TypeError):
        return None
    assure = corps.get("assure")
    return Principal(str(corps["sub"]), role, None if not assure else str(assure))
