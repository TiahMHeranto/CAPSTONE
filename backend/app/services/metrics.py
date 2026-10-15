def calculer(connection) -> dict:
    volume, moyenne, p50, p95 = connection.execute(
        """
        SELECT
            count(*)::int,
            coalesce(avg(duree_ms), 0),
            coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY duree_ms), 0),
            coalesce(percentile_cont(0.95) WITHIN GROUP (ORDER BY duree_ms), 0)
        FROM app.predictions
        """
    ).fetchone()
    bas, milieu, haut, sommet = connection.execute(
        """
        SELECT
            count(*) FILTER (WHERE score < 0.25),
            count(*) FILTER (WHERE score >= 0.25 AND score < 0.5),
            count(*) FILTER (WHERE score >= 0.5 AND score < 0.75),
            count(*) FILTER (WHERE score >= 0.75)
        FROM app.predictions
        """
    ).fetchone()
    erreurs = connection.execute(
        """
        SELECT count(*) FROM app.audit_log
        WHERE action IN ('rejet_facture', 'score_indisponible')
        """
    ).fetchone()
    return {
        "volume": int(volume),
        "erreurs": int(erreurs[0]),
        "latence_ms": {
            "moyenne": round(float(moyenne), 2),
            "p50": round(float(p50), 2),
            "p95": round(float(p95), 2),
        },
        "distribution_scores": {
            "0-0.25": int(bas),
            "0.25-0.5": int(milieu),
            "0.5-0.75": int(haut),
            "0.75-1": int(sommet),
        },
    }
