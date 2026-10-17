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
from app.rag.glossaire import formule_recherche, texte_recherche
from app.rag.route import intention
from app.services.comptes import fiche_connectee
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
            voie = intention(question)
            vecteur = embarquer(texte_recherche(question))
            assure = principal.assure_id if principal.role == "assure" else None
            cache = _lire_cache(connection, principal.role, assure, vecteur, voie)
            if cache is not None:
                cache["cache"] = True
                return 200, cache
            fiche = fiche_connectee(connection, principal)
            formule = formule_recherche(principal.role, question, _formule_fiche(fiche))
            extraits: list[dict] = []
            if voie in {"contrat", "les_deux"}:
                contrat = _contrat(connection, assure) if principal.role == "assure" else None
                extraits = _chercher(connection, vecteur, principal.role, contrat, formule)
            historique = None
            if voie in {"dossier", "les_deux"}:
                historique = _dossier(connection, principal)
            texte = generer(question, extraits, historique, fiche)
            sources = _sources(extraits, historique)
            _ecrire_cache(
                connection, principal.role, assure, question, vecteur, texte, sources, voie
            )
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


def generer(
    question: str,
    extraits: list[dict],
    historique: list[dict] | None,
    fiche: dict | None = None,
) -> str:
    blocs = []
    for extrait in extraits:
        blocs.append(f"[{extrait['source']} p.{extrait['page']}] {extrait['contenu']}")
    if historique is None:
        dossier = "(historique non consulte)"
    elif not historique:
        dossier = "(aucun dossier pour le compte connecte)"
    else:
        dossier = "\n".join(
            f"{ligne['facture_id']} statut {ligne['statut']} "
            f"type {ligne['type_facture']} montant {ligne['montant_total']} "
            f"soin {ligne['date_soin']} ordonnance {ligne['ordonnance_id'] or '-'}"
            for ligne in historique
        )
    message = (
        "Extraits:\n"
        + ("\n".join(blocs) if blocs else "(aucun extrait)")
        + "\n\nProfil et contrat de l'assure connecte:\n"
        + _texte_fiche(fiche)
        + "\n\nHistorique du compte connecte:\n"
        + dossier
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
                        "uniquement a partir des extraits, du profil connecte "
                        "et de l'historique. Pour l'assure du jeton, reponds "
                        "avec sa formule seulement, sans melanger les plafonds "
                        "d'une autre formule. Pour les autres roles, si les "
                        "valeurs different entre ESSENTIEL, CONFORT et PREMIUM, "
                        "donne chaque formule. Cite le nom du document. "
                        "Un statut ou un montant de facture vient de "
                        "l'historique : cite son identifiant. Une regle ou un "
                        "plafond vient des extraits. Si l'information manque, "
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


def _texte_fiche(fiche: dict | None) -> str:
    if not fiche or fiche.get("motif"):
        return "(aucun profil : reserve a l'assure connecte)"
    nom = fiche.get("nom") or {}
    libelle = " ".join(part for part in (nom.get("prenoms"), nom.get("nom")) if part)
    principal = fiche.get("assure_principal") or {}
    libelle_principal = " ".join(
        part for part in (principal.get("prenoms"), principal.get("nom")) if part
    )
    contrat = fiche.get("contrat") or {}
    lignes = [
        f"nom {libelle or 'inconnu'}",
        f"rang {fiche.get('rang') or '-'}",
        f"assure_principal {libelle_principal or '-'}",
        f"sexe {fiche.get('sexe') or '-'}",
        f"ville {fiche.get('ville') or '-'}",
        f"adhesion {fiche.get('date_adhesion') or '-'}",
        (
            f"contrat {contrat.get('contrat_id') or '-'} "
            f"formule {contrat.get('formule') or '-'} "
            f"statut {contrat.get('statut') or '-'} "
            f"effet {contrat.get('date_effet') or '-'}"
        ),
    ]
    return "\n".join(lignes)


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


def _formule_fiche(fiche: dict | None) -> str | None:
    if not fiche:
        return None
    contrat = fiche.get("contrat") or {}
    if not isinstance(contrat, dict):
        return None
    return contrat.get("formule")


def _chercher(
    connection,
    vecteur: list[float],
    role: str,
    contrat_id: str | None,
    formule: str | None,
) -> list[dict]:
    filtres = ["embedding IS NOT NULL"]
    params: list = []
    if role == "assure":
        filtres.append("(contrat_id IS NULL OR contrat_id = %s)")
        params.append(contrat_id)
    elif role != "administrateur":
        filtres.append("contrat_id IS NULL")
    if formule in {"ESSENTIEL", "CONFORT", "PREMIUM"}:
        filtres.append("(source NOT ILIKE 'Conditions_Generales_%%' OR source ILIKE %s)")
        params.append(f"%{formule}%")
    params.append(_texte(vecteur))
    requete = f"""
        SELECT source, page, contenu
        FROM app.documents
        WHERE {" AND ".join(filtres)}
        ORDER BY embedding <=> %s::vector
        LIMIT 8
        """
    rows = connection.execute(requete, tuple(params)).fetchall()
    return [{"source": row[0], "page": row[1], "contenu": row[2]} for row in rows]


def _dossier(connection, principal: Principal) -> list[dict]:
    if principal.role == "assure" and principal.assure_id:
        colonne, valeur = "assure_id", principal.assure_id
    elif principal.role == "prestataire" and principal.prestataire_id:
        colonne, valeur = "prestataire_id", principal.prestataire_id
    else:
        return []
    rows = connection.execute(
        f"""
        SELECT facture_id, statut, type_facture, montant_total,
               date_soin::text, ordonnance_id
        FROM (
            SELECT facture_id, statut, type_facture, montant_total,
                   date_soin, ordonnance_id
            FROM clean.factures
            WHERE {colonne} = %s
            UNION ALL
            SELECT facture_id, statut, type_facture, montant_total,
                   date_soin, ordonnance_id
            FROM app.factures
            WHERE {colonne} = %s
        ) AS dossier
        ORDER BY date_soin DESC NULLS LAST
        LIMIT 8
        """,
        (valeur, valeur),
    ).fetchall()
    return [
        {
            "facture_id": row[0],
            "statut": row[1],
            "type_facture": row[2],
            "montant_total": row[3],
            "date_soin": row[4],
            "ordonnance_id": row[5],
        }
        for row in rows
    ]


def _sources(extraits: list[dict], historique: list[dict] | None) -> list[dict]:
    sources: list[dict] = []
    vus: set[tuple[str, int | None]] = set()
    for ligne in extraits:
        cle = (ligne["source"], ligne["page"])
        if cle not in vus:
            vus.add(cle)
            sources.append({"source": ligne["source"], "page": ligne["page"]})
    for ligne in historique or []:
        cle_facture = (ligne["facture_id"], None)
        if cle_facture not in vus:
            vus.add(cle_facture)
            sources.append({"source": ligne["facture_id"], "page": None})
    return sources


def _lire_cache(
    connection, role: str, assure_id: str | None, vecteur: list[float], voie: str
) -> dict | None:
    row = connection.execute(
        """
        SELECT reponse, sources, 1 - (embedding <=> %s::vector) AS proximite
        FROM app.assistant_cache
        WHERE role = %s
          AND assure_id IS NOT DISTINCT FROM %s::text
          AND intention = %s
        ORDER BY embedding <=> %s::vector
        LIMIT 1
        """,
        (_texte(vecteur), role, assure_id, voie, _texte(vecteur)),
    ).fetchone()
    if row is None or float(row[2]) < settings.assistant_cache_similarite:
        return None
    return {"reponse": row[0], "sources": row[1]}


def _ecrire_cache(connection, role, assure_id, question, vecteur, reponse, sources, voie) -> None:
    empreinte = hashlib.sha256(f"{role}|{assure_id}|{voie}|{question}".encode()).hexdigest()
    connection.execute(
        """
        INSERT INTO app.assistant_cache
            (empreinte, role, assure_id, embedding, reponse, sources, intention)
        VALUES (%s, %s, %s, %s::vector, %s, %s::jsonb, %s)
        ON CONFLICT (empreinte) DO NOTHING
        """,
        (empreinte, role, assure_id, _texte(vecteur), reponse, json.dumps(sources), voie),
    )


def _texte(vecteur: list[float]) -> str:
    return "[" + ",".join(f"{valeur:.6f}" for valeur in vecteur) + "]"
