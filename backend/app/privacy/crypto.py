import base64
import hashlib
import hmac
import json
from typing import Any

from cryptography.fernet import Fernet


def pseudonyme(valeur: str, clef: str) -> str:
    digest = hmac.new(clef.encode("utf-8"), valeur.encode("utf-8"), hashlib.sha256).digest()
    return digest.hex()


def coffre_fernet(clef: str) -> Fernet:
    derived = hashlib.sha256(clef.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(derived))


def chiffrer(fernet: Fernet, contenu: dict[str, Any]) -> bytes:
    return fernet.encrypt(json.dumps(contenu, ensure_ascii=False).encode("utf-8"))


def dechiffrer(fernet: Fernet, charge: bytes) -> dict[str, Any]:
    return json.loads(fernet.decrypt(charge).decode("utf-8"))


def tranche_age(annee: int | None, reference: int) -> str | None:
    if annee is None:
        return None
    age = reference - annee
    if age < 0:
        return None
    if age < 18:
        return "0-17"
    if age < 40:
        return "18-39"
    if age < 60:
        return "40-59"
    return "60+"


def detail_audit(resultat: str) -> str:
    return json.dumps({"resultat": resultat}, ensure_ascii=False)
