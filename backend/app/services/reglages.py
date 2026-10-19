import re
from pathlib import Path

from app.config import settings
from app.schemas.facture import Rejet
from app.services.audit import auditer

CLES = (
    "alert_threshold",
    "active_model_version",
    "notification_channels",
    "n8n_webhook_url",
    "drift_psi_threshold",
    "rag_corpus_path",
)
CANAUX = frozenset({"slack", "email", "webhook"})
_VERSION = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$")


def lire(connection) -> dict[str, str]:
    rows = connection.execute(
        "SELECT key, value FROM app.settings WHERE key = ANY(%s)",
        (list(CLES),),
    ).fetchall()
    trouve = {row[0]: row[1] for row in rows}
    if "alert_threshold" not in trouve or "active_model_version" not in trouve:
        raise LookupError("reglages incomplets")
    return {
        "alert_threshold": trouve["alert_threshold"],
        "active_model_version": trouve["active_model_version"],
        "notification_channels": trouve.get("notification_channels", ""),
        "n8n_webhook_url": trouve.get("n8n_webhook_url", ""),
        "drift_psi_threshold": trouve.get("drift_psi_threshold", ""),
        "rag_corpus_path": trouve.get("rag_corpus_path") or settings.rag_dir,
    }


def vue(reglages: dict[str, str]) -> dict:
    canaux = [canal for canal in reglages["notification_channels"].split(",") if canal]
    return {
        "alert_threshold": float(reglages["alert_threshold"]),
        "active_model_version": reglages["active_model_version"],
        "notification_channels": canaux,
        "n8n_webhook_url": reglages["n8n_webhook_url"],
        "drift_psi_threshold": _seuil_derive(reglages.get("drift_psi_threshold", "")),
        "rag_corpus_path": reglages.get("rag_corpus_path") or settings.rag_dir,
    }


def normaliser(changements: dict) -> tuple[dict[str, str], list[Rejet]]:
    propres: dict[str, str] = {}
    rejets: list[Rejet] = []
    if "alert_threshold" in changements:
        valeur = changements["alert_threshold"]
        if isinstance(valeur, bool) or not isinstance(valeur, (int, float)) or not 0 <= valeur <= 1:
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="seuil hors de 0 a 1"))
        else:
            propres["alert_threshold"] = _nombre(float(valeur))
    if "notification_channels" in changements:
        canaux = changements["notification_channels"]
        if not isinstance(canaux, list) or any(canal not in CANAUX for canal in canaux):
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="canal inconnu"))
        else:
            propres["notification_channels"] = ",".join(sorted(set(canaux)))
    if "n8n_webhook_url" in changements:
        url = changements["n8n_webhook_url"]
        if url is None or not isinstance(url, str) or not _url_valide(url):
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="url webhook http ou https"))
        else:
            propres["n8n_webhook_url"] = url.strip()
    if "drift_psi_threshold" in changements:
        valeur = changements["drift_psi_threshold"]
        if isinstance(valeur, bool) or not isinstance(valeur, (int, float)) or not 0 <= valeur <= 5:
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="seuil de derive hors bornes"))
        else:
            propres["drift_psi_threshold"] = _nombre(float(valeur))
    if "active_model_version" in changements:
        version = changements["active_model_version"]
        if not isinstance(version, str) or _VERSION.fullmatch(version) is None:
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="version de modele illisible"))
        else:
            propres["active_model_version"] = version
    if "rag_corpus_path" in changements:
        chemin = changements["rag_corpus_path"]
        if not isinstance(chemin, str) or not _dossier_valide(chemin):
            rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="dossier du corpus introuvable"))
        else:
            propres["rag_corpus_path"] = str(Path(chemin.strip()))
    inconnus = set(changements) - set(CLES)
    if inconnus:
        rejets.append(Rejet(code="REGLAGE_INVALIDE", motif="cle inconnue"))
    return propres, rejets


def appliquer(connection, acteur: str, propres: dict[str, str]) -> dict[str, str]:
    actuel = lire(connection)
    for cle, valeur in propres.items():
        avant = actuel.get(cle, "")
        if avant == valeur:
            continue
        connection.execute(
            """
            INSERT INTO app.settings (key, value, updated_at)
            VALUES (%s, %s, now())
            ON CONFLICT (key) DO UPDATE
                SET value = EXCLUDED.value, updated_at = now()
            """,
            (cle, valeur),
        )
        auditer(
            connection,
            acteur,
            "changement_reglage",
            "settings",
            cle,
            {"avant": avant, "apres": valeur},
        )
        actuel[cle] = valeur
    return actuel


def _seuil_derive(valeur: str) -> float | None:
    if not valeur:
        return None
    return float(valeur)


def _nombre(valeur: float) -> str:
    texte = f"{round(valeur, 6):.6f}".rstrip("0").rstrip(".")
    return texte or "0"


def _dossier_valide(chemin: str) -> bool:
    propre = chemin.strip()
    if not propre or len(propre) > 240 or "\x00" in propre:
        return False
    morceaux = Path(propre).parts
    if ".." in morceaux:
        return False
    dossier = Path(propre)
    return dossier.is_absolute() and dossier.is_dir()


def _url_valide(url: str) -> bool:
    propre = url.strip()
    if propre == "":
        return True
    if len(propre) > 300 or any(caractere.isspace() for caractere in propre):
        return False
    return propre.startswith(("http://", "https://"))
