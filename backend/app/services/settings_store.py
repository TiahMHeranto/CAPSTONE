from psycopg import Connection


def get_alert_threshold(connection: Connection) -> float:
    row = connection.execute(
        "SELECT value FROM app.settings WHERE key = 'alert_threshold'"
    ).fetchone()
    if row is None:
        raise LookupError("alert_threshold absent de app.settings")
    return float(row[0])
