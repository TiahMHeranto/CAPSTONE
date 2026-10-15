def lire_codes(connection) -> tuple[set[str], set[str]]:
    actes = {row[0] for row in connection.execute("SELECT code_acte FROM clean.referentiel_actes")}
    medicaments = {
        row[0]
        for row in connection.execute("SELECT code_medicament FROM clean.referentiel_medicaments")
    }
    return actes, medicaments
