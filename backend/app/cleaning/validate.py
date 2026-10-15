from app.schemas.facture import FactureIn, Rejet


def valider_facture(
    facture: FactureIn,
    codes_actes: set[str],
    codes_medicaments: set[str],
) -> list[Rejet]:
    rejets: list[Rejet] = []
    if not facture.facture_id.strip():
        rejets.append(Rejet(code="CHAMP_OBLIGATOIRE", motif="facture_id vide"))
    if facture.devise != "MGA":
        rejets.append(Rejet(code="DEVISE_INVALIDE", motif="devise attendue: MGA"))
    if facture.montant_total < 0:
        rejets.append(Rejet(code="MONTANT_NEGATIF", motif="montant_total negatif"))
    if not facture.lignes:
        rejets.append(Rejet(code="LIGNES_ABSENTES", motif="aucune ligne de facture"))
    if _dates_incoherentes(facture):
        rejets.append(
            Rejet(
                code="DATES_INCOHERENTES",
                motif="ordre attendu: soin, facture, reception, traitement",
            )
        )
    somme = 0
    for index, ligne in enumerate(facture.lignes, start=1):
        somme += ligne.montant
        rejets.extend(_valider_ligne(index, ligne, codes_actes, codes_medicaments))
    if facture.lignes and somme != facture.montant_total:
        rejets.append(
            Rejet(code="MONTANT_LIGNES", motif="la somme des lignes differe du montant total")
        )
    return rejets


def _valider_ligne(index, ligne, codes_actes: set[str], codes_medicaments: set[str]) -> list[Rejet]:
    rejets: list[Rejet] = []
    if ligne.quantite <= 0 or ligne.prix_unitaire < 0 or ligne.montant < 0:
        rejets.append(Rejet(code="MONTANT_NEGATIF", motif=f"ligne {index}: montant ou quantite"))
    if ligne.type_ligne not in {"ACTE", "MEDICAMENT"}:
        rejets.append(Rejet(code="TYPE_LIGNE", motif=f"ligne {index}: type_ligne inconnu"))
        return rejets
    connus = codes_actes if ligne.type_ligne == "ACTE" else codes_medicaments
    if not ligne.code.strip() or ligne.code not in connus:
        rejets.append(Rejet(code="CODE_INCONNU", motif=f"ligne {index}: code hors referentiel"))
    return rejets


def _dates_incoherentes(facture: FactureIn) -> bool:
    chain = [facture.date_soin, facture.date_facture]
    if facture.date_reception is not None:
        chain.append(facture.date_reception)
    if facture.date_traitement is not None:
        chain.append(facture.date_traitement)
    return any(chain[index] > chain[index + 1] for index in range(len(chain) - 1))
