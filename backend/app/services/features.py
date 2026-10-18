"""Les 23 variables du pipeline v2, dans l'ordre vu à l'entraînement.

Le modèle ne lit pas la facture brute. Les fenêtres de 7 jours comptent
la facture en cours et les factures déjà connues du même assuré.
"""

import re
from datetime import date

COLONNES_V2 = (
    "ord_perimee",
    "nb_lignes_non_prescrites",
    "nb_lignes_qte_excedentaire",
    "presta_apres_fin_convention",
    "ord_apres_soin",
    "ord_autre_assure",
    "soin_avant_adhesion",
    "soin_apres_radiation",
    "ratio_tarif_max",
    "prix_unitaire_max",
    "montant_total",
    "repetition_potentielle",
    "nb_factures_meme_jour_prestataire",
    "type_facture",
    "a_ordonnance",
    "nb_factures_assure_7j",
    "nb_factures_meme_code_7j",
    "delai_heures_facture_precedente",
    "montant_identique_48h",
    "majoration_horaire_incoherente",
    "ratio_tarif_referentiel_max",
    "upcoding_specialite_suspect",
    "soin_jour_ferme",
)

LIBELLES = {
    "ord_perimee": "Ordonnance périmée",
    "nb_lignes_non_prescrites": "Lignes absentes de l'ordonnance",
    "nb_lignes_qte_excedentaire": "Quantités au-dessus de la prescription",
    "presta_apres_fin_convention": "Soin après la fin de convention",
    "ord_apres_soin": "Ordonnance datée après le soin",
    "ord_autre_assure": "Ordonnance d'un autre assuré",
    "soin_avant_adhesion": "Soin avant l'adhésion",
    "soin_apres_radiation": "Soin après la radiation",
    "ratio_tarif_max": "Plus fort écart à la grille du prestataire",
    "prix_unitaire_max": "Prix unitaire le plus élevé",
    "montant_total": "Montant total de la facture",
    "repetition_potentielle": "Répétition possible",
    "nb_factures_meme_jour_prestataire": "Factures du même prestataire le même jour",
    "type_facture": "Type de facture",
    "a_ordonnance": "Présence d'une ordonnance",
    "nb_factures_assure_7j": "Factures de l'assuré sur 7 jours",
    "nb_factures_meme_code_7j": "Même code revu sur 7 jours",
    "delai_heures_facture_precedente": "Heures depuis la facture précédente",
    "montant_identique_48h": "Même montant dans les 48 heures",
    "majoration_horaire_incoherente": "Majoration nuit ou férié en horaire ouvert",
    "ratio_tarif_referentiel_max": "Plus fort écart au tarif de référence",
    "upcoding_specialite_suspect": "Acte spécialisé chez un prestataire généraliste",
    "soin_jour_ferme": "Soin un jour de fermeture",
}

_MAJORATION = re.compile(r"nuit|dimanche|férié|ferie", re.IGNORECASE)
_UPCODING = re.compile(r"URG|ENDOC|CARDIO|SPE", re.IGNORECASE)
_PRESTATAIRE_LARGE = re.compile(r"GENERAL|PHARMA|CABINET", re.IGNORECASE)


def construire_variables(
    facture: dict,
    lignes: list[dict],
    ordonnance: dict | None = None,
    lignes_ordonnance: list[dict] | None = None,
    assure: dict | None = None,
    prestataire: dict | None = None,
    contrat: dict | None = None,
    tarifs: dict[str, float] | None = None,
    historique: list[dict] | None = None,
    referentiel: dict[str, dict] | None = None,
) -> dict:
    del contrat
    tarifs = tarifs or {}
    historique = historique or []
    lignes_ordonnance = lignes_ordonnance or []
    referentiel = referentiel or {}
    date_soin = _jour(facture["date_soin"])
    prix = [int(ligne["prix_unitaire"]) for ligne in lignes]
    prescrit = {ligne["code"]: float(ligne["quantite"]) for ligne in lignes_ordonnance}
    non_prescrites = 0
    excedent = 0
    if ordonnance is not None or facture.get("ordonnance_id"):
        for ligne in lignes:
            qte = prescrit.get(ligne["code"])
            if qte is None:
                non_prescrites += 1
            elif float(ligne["quantite"]) > qte:
                excedent += 1
    delai = _delai(date_soin, ordonnance)
    validite = None if ordonnance is None else ordonnance.get("validite_jours")
    ratios_grille = []
    ratios_ref = []
    for ligne in lignes:
        pratique = tarifs.get(ligne["code"])
        if pratique not in (None, 0):
            ratios_grille.append(int(ligne["prix_unitaire"]) / float(pratique))
        info = referentiel.get(ligne["code"]) or {}
        plafond = info.get("tarif_max") or info.get("tarif_reference")
        if plafond not in (None, 0):
            ratios_ref.append(int(ligne["prix_unitaire"]) / float(plafond))
    nb_cle = 1 + sum(1 for autre in historique if _meme_cle(facture, autre))
    nb_jour = 1 + sum(1 for autre in historique if _meme_jour_prestataire(facture, autre))
    fenetre = [autre for autre in historique if _dans_sept_jours(date_soin, autre.get("date_soin"))]
    precedente = _precedente(date_soin, historique)
    delai_heures = None
    if precedente is not None:
        delai_heures = (_jour(date_soin) - _jour(precedente["date_soin"])).days * 24
    return {
        "ord_perimee": int(delai is not None and validite is not None and delai > validite),
        "nb_lignes_non_prescrites": non_prescrites
        if facture.get("ordonnance_id") or ordonnance
        else 0,
        "nb_lignes_qte_excedentaire": excedent,
        "presta_apres_fin_convention": _apres(
            date_soin, None if prestataire is None else prestataire.get("date_fin_convention")
        ),
        "ord_apres_soin": int(delai is not None and delai < 0),
        "ord_autre_assure": _autre_assure(facture, ordonnance),
        "soin_avant_adhesion": _avant(
            date_soin, None if assure is None else assure.get("date_adhesion")
        ),
        "soin_apres_radiation": _apres(
            date_soin, None if assure is None else assure.get("date_radiation")
        ),
        "ratio_tarif_max": max(ratios_grille) if ratios_grille else None,
        "prix_unitaire_max": max(prix) if prix else None,
        "montant_total": int(facture["montant_total"]),
        "repetition_potentielle": int(nb_cle > 1),
        "nb_factures_meme_jour_prestataire": nb_jour,
        "type_facture": facture.get("type_facture"),
        "a_ordonnance": int(bool(facture.get("ordonnance_id") or ordonnance is not None)),
        "nb_factures_assure_7j": 1 + len(fenetre),
        "nb_factures_meme_code_7j": _meme_code(lignes, fenetre),
        "delai_heures_facture_precedente": delai_heures,
        "montant_identique_48h": int(
            precedente is not None
            and delai_heures is not None
            and delai_heures <= 48
            and int(precedente["montant_total"]) == int(facture["montant_total"])
        ),
        "majoration_horaire_incoherente": _majoration(
            date_soin, facture.get("heure_soin"), lignes, referentiel
        ),
        "ratio_tarif_referentiel_max": max(ratios_ref) if ratios_ref else None,
        "upcoding_specialite_suspect": _upcoding(
            lignes, None if prestataire is None else prestataire.get("type_prestataire")
        ),
        "soin_jour_ferme": _jour_ferme(
            date_soin, None if prestataire is None else prestataire.get("jours_ouverture")
        ),
    }


def _jour(valeur) -> date:
    if isinstance(valeur, date):
        return valeur
    return date.fromisoformat(str(valeur)[:10])


def _dans_sept_jours(date_soin: date, autre) -> bool:
    if autre is None:
        return False
    ecart = (_jour(date_soin) - _jour(autre)).days
    return 0 <= ecart < 7


def _precedente(date_soin: date, historique: list[dict]) -> dict | None:
    candidats = [autre for autre in historique if _jour(autre["date_soin"]) <= date_soin]
    if not candidats:
        return None
    return max(
        candidats, key=lambda autre: (_jour(autre["date_soin"]), str(autre.get("facture_id") or ""))
    )


def _meme_code(lignes: list[dict], fenetre: list[dict]) -> int:
    codes = [ligne["code"] for ligne in lignes]
    if not codes:
        return 1
    comptes = []
    for code in codes:
        anterieurs = sum(1 for autre in fenetre if code in (autre.get("codes") or []))
        comptes.append(1 + anterieurs)
    return max(comptes)


def _majoration(date_soin: date, heure, lignes: list[dict], referentiel: dict) -> int:
    if date_soin.weekday() >= 5 or not _heure_ouverte(heure):
        return 0
    for ligne in lignes:
        libelle = str((referentiel.get(ligne["code"]) or {}).get("libelle") or "")
        if _MAJORATION.search(libelle):
            return 1
    return 0


def _heure_ouverte(heure) -> bool:
    if not heure or ":" not in str(heure):
        return False
    try:
        heures = int(str(heure).split(":", 1)[0])
    except ValueError:
        return False
    return 8 <= heures <= 17


def _upcoding(lignes: list[dict], type_prestataire: str | None) -> int:
    if not type_prestataire or _PRESTATAIRE_LARGE.search(type_prestataire) is None:
        return 0
    return int(any(_UPCODING.search(ligne["code"] or "") for ligne in lignes))


def _jour_ferme(date_soin: date, jours_ouverture) -> int:
    if jours_ouverture is None or str(jours_ouverture).strip() == "":
        return 0
    code = str(date_soin.weekday() + 1)
    return int(code not in str(jours_ouverture))


def _delai(date_soin: date, ordonnance: dict | None) -> int | None:
    if ordonnance is None or ordonnance.get("date_prescription") is None:
        return None
    return (date_soin - _jour(ordonnance["date_prescription"])).days


def _avant(date_soin: date, borne) -> int:
    return int(borne is not None and date_soin < _jour(borne))


def _apres(date_soin: date, borne) -> int:
    return int(borne is not None and date_soin > _jour(borne))


def _autre_assure(facture: dict, ordonnance: dict | None) -> int:
    if ordonnance is None or not ordonnance.get("assure_id"):
        return 0
    return int(ordonnance["assure_id"] != facture.get("assure_id"))


def _meme_jour_prestataire(facture: dict, autre: dict) -> bool:
    presta = facture.get("prestataire_id")
    if not presta:
        return False
    return autre.get("prestataire_id") == presta and _jour(autre.get("date_soin")) == _jour(
        facture["date_soin"]
    )


def _meme_cle(facture: dict, autre: dict) -> bool:
    return (
        autre.get("assure_id") == facture.get("assure_id")
        and autre.get("prestataire_id") == facture.get("prestataire_id")
        and int(autre.get("montant_total")) == int(facture["montant_total"])
        and _jour(autre.get("date_soin")) == _jour(facture["date_soin"])
    )
