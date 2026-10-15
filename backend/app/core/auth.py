import hmac
from typing import Annotated

from fastapi import Header

from app.config import settings
from app.core.tokens import ROLES, AccesRefuse, Principal, lire_jeton


def _clef_admin(clef: str | None) -> bool:
    attendue = settings.admin_api_key
    if not clef or not attendue or len(clef) != len(attendue):
        return False
    return hmac.compare_digest(clef, attendue)


def exiger(*roles: str):
    inconnus = set(roles) - ROLES
    if inconnus:
        raise ValueError("role inconnu")

    def dependance(
        authorization: Annotated[str | None, Header()] = None,
        x_admin_key: Annotated[str | None, Header()] = None,
    ) -> Principal:
        if "administrateur" in roles and _clef_admin(x_admin_key):
            return Principal("admin-clef", "administrateur", None)
        principal = lire_jeton(authorization)
        if principal is None:
            raise AccesRefuse(401, "NON_AUTORISE", "authentification requise")
        if principal.role not in roles:
            raise AccesRefuse(403, "ROLE_REFUSE", "role non autorise")
        return principal

    return dependance
