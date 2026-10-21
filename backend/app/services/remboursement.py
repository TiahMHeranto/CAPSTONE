"""Montant pris en charge à partir du barème de la formule."""


def appliquer(
    eligible: int,
    taux: float,
    franchise: int,
    exclu: int,
    plafond: int | None,
) -> tuple[int, int]:
    couvert = max(0, eligible - max(exclu, 0))
    base = max(0, couvert - max(franchise, 0))
    ratio = taux / 100 if taux > 1 else taux
    pris = int(round(base * ratio))
    pris = max(0, min(pris, couvert))
    if plafond is not None:
        pris = min(pris, max(plafond, 0))
    return pris, eligible - pris


def montants(connection, facture_id: str, decision: str) -> tuple[int | None, int | None]:
    if decision == "complement":
        return None, None
    row = connection.execute(
        """
        SELECT f.montant_total, f.montant_eligible, f.type_facture, f.assure_id,
               f.date_soin, g.taux_remboursement, g.franchise_par_facture,
               g.plafond_annuel_categorie, g.plafond_annuel_global, g.actes_exclus
        FROM app.factures AS f
        LEFT JOIN clean.assures AS a ON a.assure_id = f.assure_id
        LEFT JOIN clean.contrats AS c
            ON c.contrat_id = COALESCE(f.contrat_id, a.contrat_id)
        LEFT JOIN app.garanties AS g
            ON g.formule = c.formule AND g.categorie = f.type_facture
        WHERE f.facture_id = %s
        -- garantie_remboursement
        """,
        (facture_id,),
    ).fetchone()
    if row is None or row[0] is None:
        return None, None
    eligible = _entier(row[1] if row[1] is not None else row[0])
    if decision == "rejeter":
        return 0, eligible
    if row[5] is None:
        return None, None
    exclu = _actes_exclus(connection, facture_id, row[9])
    plafond = _plafond_restant(
        connection,
        row[3],
        row[2],
        row[4],
        facture_id,
        _entier_ou_vide(row[7]),
        _entier_ou_vide(row[8]),
    )
    return appliquer(eligible, float(row[5]), _entier(row[6]), exclu, plafond)


def _plafond_restant(connection, assure_id, categorie, date_soin, facture_id, plafond_cat, plafond_global):
    if not assure_id or (plafond_cat is None and plafond_global is None):
        return None
    annee = _annee(date_soin)
    if annee is None:
        return None
    debut = f"{annee}-01-01"
    fin = f"{annee + 1}-01-01"
    restes = []
    if plafond_cat is not None:
        deja = _cumul(connection, assure_id, categorie, facture_id, debut, fin, True)
        restes.append(plafond_cat - deja)
    if plafond_global is not None:
        deja = _cumul(connection, assure_id, categorie, facture_id, debut, fin, False)
        restes.append(plafond_global - deja)
    return min(restes) if restes else None


def _cumul(connection, assure_id, categorie, facture_id, debut, fin, par_categorie) -> int:
    filtre = "AND type_facture = %s" if par_categorie else ""
    params_app = [assure_id, facture_id, debut, fin]
    params_clean = [assure_id, debut, fin]
    if par_categorie:
        params_app.insert(1, categorie)
        params_clean.insert(1, categorie)
    app = connection.execute(
        f"""
        SELECT COALESCE(SUM(montant_pris_en_charge), 0)
        FROM app.factures
        WHERE assure_id = %s {filtre}
          AND facture_id <> %s
          AND statut = 'VALIDE'
          AND date_soin >= %s AND date_soin < %s
        """,
        tuple(params_app),
    ).fetchone()
    clean = connection.execute(
        f"""
        SELECT COALESCE(SUM(montant_pris_en_charge), 0)
        FROM clean.factures
        WHERE assure_id = %s {filtre}
          AND statut = 'PAYEE'
          AND date_soin >= %s AND date_soin < %s
        """,
        tuple(params_clean),
    ).fetchone()
    return _entier(None if app is None else app[0]) + _entier(None if clean is None else clean[0])


def _actes_exclus(connection, facture_id: str, actes) -> int:
    if not actes:
        return 0
    codes = {item.strip() for item in str(actes).split("|") if item.strip()}
    if not codes:
        return 0
    rows = connection.execute(
        """
        SELECT code, type_ligne, quantite, prix_unitaire, montant
        FROM app.lignes_facture
        WHERE facture_id = %s
        """,
        (facture_id,),
    ).fetchall()
    return sum(_entier(row[-1]) for row in rows if row[0] in codes)


def _entier(valeur) -> int:
    if valeur is None:
        return 0
    return int(round(float(valeur)))


def _entier_ou_vide(valeur) -> int | None:
    if valeur is None or valeur == "":
        return None
    return int(round(float(valeur)))


def _annee(valeur) -> int | None:
    if valeur is None:
        return None
    if hasattr(valeur, "year"):
        return int(valeur.year)
    texte = str(valeur)
    if len(texte) >= 4 and texte[:4].isdigit():
        return int(texte[:4])
    return None
