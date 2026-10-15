"""Les 29 variables du pipeline v2, dans l'ordre vu à l'entraînement.

Le modèle ne lit pas la facture brute. Cette fonction produit le tableau
qu'il a vu : montants, ordonnance, dates de couverture, et répétition.
"""

from datetime import date

COLONNES_V2 = (
    "type_facture",
    "mode_reglement",
    "canal_reception",
    "montant_total",
    "quantite_totale",
    "montant_lignes_calcule",
    "prix_unitaire_max",
    "ratio_tarif_max",
    "nb_lignes_sans_tarif",
    "a_ordonnance",
    "delai_ord_jours",
    "ord_apres_soin",
    "ord_perimee",
    "ord_autre_assure",
    "nb_lignes_non_prescrites",
    "nb_lignes_qte_excedentaire",
    "soin_avant_adhesion",
    "soin_apres_radiation",
    "soin_avant_convention",
    "presta_apres_fin_convention",
    "mois_soin",
    "jour_semaine_soin",
    "nb_factures_meme_cle",
    "repetition_potentielle",
    "nb_factures_meme_jour_prestataire",
    "formule",
    "type_prestataire",
    "presta_specialite",
    "niveau_tarif",
)

LIBELLES = {
    "montant_total": "Montant total de la facture",
    "quantite_totale": "Somme des quantités",
    "montant_lignes_calcule": "Somme des montants de lignes",
    "prix_unitaire_max": "Prix unitaire le plus élevé",
    "ratio_tarif_max": "Plus fort écart au tarif de référence",
    "nb_lignes_sans_tarif": "Lignes sans tarif de référence",
    "a_ordonnance": "Présence d'une ordonnance",
    "delai_ord_jours": "Jours entre la prescription et le soin",
    "ord_apres_soin": "Ordonnance datée après le soin",
    "ord_perimee": "Ordonnance périmée",
    "ord_autre_assure": "Ordonnance d'un autre assuré",
    "nb_lignes_non_prescrites": "Lignes absentes de l'ordonnance",
    "nb_lignes_qte_excedentaire": "Quantités au-dessus de la prescription",
    "soin_avant_adhesion": "Soin avant l'adhésion",
    "soin_apres_radiation": "Soin après la radiation",
    "soin_avant_convention": "Soin avant le conventionnement",
    "presta_apres_fin_convention": "Soin après la fin de convention",
    "mois_soin": "Mois du soin",
    "jour_semaine_soin": "Jour de la semaine",
    "nb_factures_meme_cle": "Factures de même clé",
    "repetition_potentielle": "Répétition possible",
    "nb_factures_meme_jour_prestataire": "Factures du même prestataire le même jour",
    "type_facture": "Type de facture",
    "mode_reglement": "Mode de règlement",
    "canal_reception": "Canal de réception",
    "formule": "Formule du contrat",
    "type_prestataire": "Type de prestataire",
    "presta_specialite": "Spécialité du prestataire",
    "niveau_tarif": "Niveau de tarif",
}


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
) -> dict:
    tarifs = tarifs or {}
    historique = historique or []
    lignes_ordonnance = lignes_ordonnance or []
    date_soin: date = facture["date_soin"]
    quantites = [float(ligne["quantite"]) for ligne in lignes]
    montants = [int(ligne["montant"]) for ligne in lignes]
    prix = [int(ligne["prix_unitaire"]) for ligne in lignes]
    ratios = []
    sans_tarif = 0
    for ligne in lignes:
        tarif = tarifs.get(ligne["code"])
        if tarif is None or tarif == 0:
            sans_tarif += 1
            continue
        ratios.append(int(ligne["prix_unitaire"]) / tarif)
    prescrit = {ligne["code"]: float(ligne["quantite"]) for ligne in lignes_ordonnance}
    non_prescrites = 0
    excedent = 0
    if ordonnance is not None:
        for ligne in lignes:
            qte = prescrit.get(ligne["code"])
            if qte is None:
                non_prescrites += 1
            elif float(ligne["quantite"]) > qte:
                excedent += 1
    delai = _delai(date_soin, ordonnance)
    validite = None if ordonnance is None else ordonnance.get("validite_jours")
    cle_historique = sum(1 for autre in historique if _meme_cle(facture, autre))
    nb_meme_cle = 1 + cle_historique
    nb_meme_jour = 1 + sum(1 for autre in historique if _meme_jour_prestataire(facture, autre))
    return {
        "montant_total": int(facture["montant_total"]),
        "quantite_totale": sum(quantites),
        "montant_lignes_calcule": sum(montants),
        "prix_unitaire_max": max(prix) if prix else None,
        "ratio_tarif_max": max(ratios) if ratios else None,
        "nb_lignes_sans_tarif": sans_tarif,
        "a_ordonnance": 0 if ordonnance is None else 1,
        "delai_ord_jours": delai,
        "ord_apres_soin": int(delai is not None and delai < 0),
        "ord_perimee": int(delai is not None and validite is not None and delai > validite),
        "ord_autre_assure": _autre_assure(facture, ordonnance),
        "nb_lignes_non_prescrites": non_prescrites,
        "nb_lignes_qte_excedentaire": excedent,
        "soin_avant_adhesion": _avant(
            date_soin, None if assure is None else assure.get("date_adhesion")
        ),
        "soin_apres_radiation": _apres(
            date_soin, None if assure is None else assure.get("date_radiation")
        ),
        "soin_avant_convention": _avant(
            date_soin, None if prestataire is None else prestataire.get("date_conventionnement")
        ),
        "presta_apres_fin_convention": _apres(
            date_soin, None if prestataire is None else prestataire.get("date_fin_convention")
        ),
        "mois_soin": date_soin.month,
        "jour_semaine_soin": date_soin.isoweekday(),
        "nb_factures_meme_cle": nb_meme_cle,
        "repetition_potentielle": int(nb_meme_cle > 1),
        "nb_factures_meme_jour_prestataire": nb_meme_jour,
        "type_facture": facture.get("type_facture"),
        "mode_reglement": facture.get("mode_reglement"),
        "canal_reception": facture.get("canal_reception"),
        "formule": None if contrat is None else contrat.get("formule"),
        "type_prestataire": None if prestataire is None else prestataire.get("type_prestataire"),
        "presta_specialite": None if prestataire is None else prestataire.get("specialite"),
        "niveau_tarif": None if prestataire is None else prestataire.get("niveau_tarif"),
    }


def _delai(date_soin: date, ordonnance: dict | None) -> int | None:
    if ordonnance is None or ordonnance.get("date_prescription") is None:
        return None
    return (date_soin - ordonnance["date_prescription"]).days


def _avant(date_soin: date, borne: date | None) -> int:
    return int(borne is not None and date_soin < borne)


def _apres(date_soin: date, borne: date | None) -> int:
    return int(borne is not None and date_soin > borne)


def _autre_assure(facture: dict, ordonnance: dict | None) -> int:
    if ordonnance is None or not ordonnance.get("assure_id"):
        return 0
    return int(ordonnance["assure_id"] != facture.get("assure_id"))


def _meme_jour_prestataire(facture: dict, autre: dict) -> bool:
    presta = facture.get("prestataire_id")
    if not presta:
        return False
    return autre.get("prestataire_id") == presta and autre.get("date_soin") == facture["date_soin"]


def _meme_cle(facture: dict, autre: dict) -> bool:
    return (
        autre.get("assure_id") == facture.get("assure_id")
        and autre.get("prestataire_id") == facture.get("prestataire_id")
        and int(autre.get("montant_total")) == int(facture["montant_total"])
        and autre.get("date_soin") == facture["date_soin"]
    )
