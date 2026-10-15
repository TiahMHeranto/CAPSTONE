from psycopg.types.json import Json


def auditer(
    connection,
    acteur: str,
    action: str,
    entite: str,
    entite_id: str,
    detail: dict,
) -> None:
    connection.execute(
        """
        INSERT INTO app.audit_log (acteur, action, entite, entite_id, detail)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (acteur, action, entite, entite_id, Json(detail)),
    )
