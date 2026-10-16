"""Assistant : recherche dans le corpus, historique de l'assuré, réponse Ollama."""

import hashlib
import json
import logging
import urllib.error
import urllib.request

import psycopg

from app.config import settings
from app.core.tokens import Principal
from app.db.session import ouvrir
from app.services.registry import ModeleIndisponible

logger = logging.getLogger(__name__)

_REFUS = (
    "ignore previous",
    "ignore les instructions",
    "ignore all",
    "system prompt",
    "tu es desormais",
    "tu es désormais",
    "mot de passe",
    "admin_api_key",
    "identites.coffre",
    "labels_fraude",
)


def question_refusee(texte: str) -> bool:
    bas = texte.lower()
    return any(motif in bas for motif in _REFUS)


def repondre(question: str, principal: Principal) -> tuple[int, dict]:
    if question_refusee(question):
        return 422, {"code": "QUESTION_REFUSEE", "motif": "question hors perimetre"}
    try:
        with ouvrir() as connection:
            vecteur = embarquer(question)
            assure = principal.assure_id if principal.role == "assure" else None
            cache = _lire_cache(connection, principal.role, assure, vecteur)
            if cache is not None:
                cache["cache"] = True
                return 200, cache
            contrat = _contrat(connection, assure)
            extraits = _chercher(connection, vecteur, contrat)
            historique = _historique(connection, assure)
            texte = generer(question, extraits, historique)
            sources = []
            vus: set[tuple[str, int]] = set()
            for ligne in extraits:
                cle = (ligne["source"], ligne["page"])
                if cle not in vus:
                    vus.add(cle)
                    sources.append({"source": ligne["source"], "page": ligne["page"]})
            _ecrire_cache(connection, principal.role, assure, question, vecteur, texte, sources)
            connection.commit()
    except ModeleIndisponible:
        return 503, {"code": "MODELE_INDISPONIBLE", "motif": "assistant indisponible"}
    except psycopg.Error as exc:
        logger.warning("assistant erreur=%s", type(exc).__name__)
        return 503, {"code": "BASE_INDISPONIBLE", "motif": "base inaccessible"}
    return 200, {"reponse": texte, "sources": sources, "cache": False}


def embarquer(texte: str) -> list[float]:
    corps = _ollama(
        "/api/embed",
        {"model": settings.ollama_embed_model, "input": texte},
    )
    vecteurs = corps.get("embeddings") or []
    if not vecteurs or len(vecteurs[0]) != 768:
        raise ModeleIndisponible("embedding illisible")
    return [float(valeur) for valeur in vecteurs[0]]


def generer(question: str, extraits: list[dict], historique: list[dict]) -> str:
    blocs = []
    for extrait in extraits:
        blocs.append(f"[{extrait['source']} p.{extrait['page']}] {extrait['contenu']}")
    dossier = []
    for ligne in historique:
        dossier.append(
            f"{ligne['facture_id']} statut {ligne['statut']} "
            f"montant {ligne['montant_total']} soin {ligne['date_soin']}"
        )
    message = (
        "Extraits:\n"
        + ("\n".join(blocs) if blocs else "(aucun extrait)")
        + "\n\nHistorique du compte connecte:\n"
        + ("\n".join(dossier) if dossier else "(aucun dossier)")
        + "\n\nQuestion:\n"
        + question
    )
    corps = _ollama(
        "/api/chat",
        {
            "model": settings.ollama_model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Tu es l'assistant PrediCare. Reponds en francais, "
                        "uniquement a partir des extraits et de l'historique. "
                        "Cite le nom du document. Si l'information manque, "
                        "dis que tu ne la trouves pas. N'invente pas un montant."
                    ),
                },
                {"role": "user", "content": message},
            ],
        },
    )
    contenu = ((corps.get("message") or {}).get("content") or "").strip()
    if not contenu:
        raise ModeleIndisponible("reponse vide")
    return contenu


def _ollama(chemin: str, charge: dict) -> dict:
    requete = urllib.request.Request(
        settings.ollama_url.rstrip("/") + chemin,
        data=json.dumps(charge).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            return json.load(reponse)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        logger.warning("ollama erreur=%s", type(exc).__name__)
        raise ModeleIndisponible("ollama indisponible") from exc


def _contrat(connection, assure_id: str | None) -> str | None:
    if not assure_id:
        return None
    row = connection.execute(
        "SELECT contrat_id FROM clean.assures WHERE assure_id = %s",
        (assure_id,),
    ).fetchone()
    if row is None or not row[0]:
        return None
    return row[0]


def _chercher(connection, vecteur: list[float], contrat_id: str | None) -> list[dict]:
    rows = connection.execute(
        """
        SELECT source, page, contenu
        FROM app.documents
        WHERE embedding IS NOT NULL
          AND (contrat_id IS NULL OR contrat_id = %s)
        ORDER BY embedding <=> %s::vector
        LIMIT 8
        """,
        (contrat_id, _texte(vecteur)),
    ).fetchall()
    return [{"source": row[0], "page": row[1], "contenu": row[2]} for row in rows]


def _historique(connection, assure_id: str | None) -> list[dict]:
    if not assure_id:
        return []
    rows = connection.execute(
        """
        SELECT facture_id, statut, montant_total, date_soin::text
        FROM app.factures
        WHERE assure_id = %s
        ORDER BY date_soin DESC NULLS LAST
        LIMIT 8
        """,
        (assure_id,),
    ).fetchall()
    return [
        {
            "facture_id": row[0],
            "statut": row[1],
            "montant_total": row[2],
            "date_soin": row[3],
        }
        for row in rows
    ]


def _lire_cache(connection, role: str, assure_id: str | None, vecteur: list[float]) -> dict | None:
    row = connection.execute(
        """
        SELECT reponse, sources, 1 - (embedding <=> %s::vector) AS proximite
        FROM app.assistant_cache
        WHERE role = %s AND assure_id IS NOT DISTINCT FROM %s::text
        ORDER BY embedding <=> %s::vector
        LIMIT 1
        """,
        (_texte(vecteur), role, assure_id, _texte(vecteur)),
    ).fetchone()
    if row is None or float(row[2]) < settings.assistant_cache_similarite:
        return None
    return {"reponse": row[0], "sources": row[1]}


def _ecrire_cache(connection, role, assure_id, question, vecteur, reponse, sources) -> None:
    empreinte = hashlib.sha256(f"{role}|{assure_id}|{question}".encode()).hexdigest()
    connection.execute(
        """
        INSERT INTO app.assistant_cache
            (empreinte, role, assure_id, embedding, reponse, sources)
        VALUES (%s, %s, %s, %s::vector, %s, %s::jsonb)
        ON CONFLICT (empreinte) DO NOTHING
        """,
        (empreinte, role, assure_id, _texte(vecteur), reponse, json.dumps(sources)),
    )


def _texte(vecteur: list[float]) -> str:
    return "[" + ",".join(f"{valeur:.6f}" for valeur in vecteur) + "]"
