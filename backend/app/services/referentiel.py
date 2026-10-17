def lister_catalogue(connection) -> list[dict]:
    actes = connection.execute(
        "SELECT code_acte, libelle FROM clean.referentiel_actes ORDER BY libelle"
    ).fetchall()
    medicaments = connection.execute(
        """
        SELECT code_medicament, libelle
        FROM clean.referentiel_medicaments
        ORDER BY libelle
        """
    ).fetchall()
    return [
        {"code": row[0], "libelle": row[1], "type_ligne": "ACTE"} for row in actes
    ] + [
        {"code": row[0], "libelle": row[1], "type_ligne": "MEDICAMENT"} for row in medicaments
    ]


def lire_codes(connection) -> tuple[set[str], set[str]]:
    actes = {row[0] for row in connection.execute("SELECT code_acte FROM clean.referentiel_actes")}
    medicaments = {
        row[0]
        for row in connection.execute("SELECT code_medicament FROM clean.referentiel_medicaments")
    }
    return actes, medicaments
