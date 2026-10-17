"""Enregistre le schéma bi comme source, en lecture seule. Relançable."""

import os
from urllib.parse import quote_plus

from superset.app import create_app

NOM = "PrediCare BI"


def main() -> None:
    utilisateur = quote_plus(os.environ["BI_DB_USER"])
    mot_de_passe = quote_plus(os.environ["BI_DB_PASSWORD"])
    base = quote_plus(os.environ.get("POSTGRES_DB", "prediccare"))
    uri = f"postgresql+psycopg2://{utilisateur}:{mot_de_passe}@db:5432/{base}"
    application = create_app()
    with application.app_context():
        from superset import db
        from superset.models.core import Database

        source = db.session.query(Database).filter_by(database_name=NOM).one_or_none()
        if source is None:
            source = Database(database_name=NOM)
            db.session.add(source)
        source.sqlalchemy_uri = uri
        source.expose_in_sqllab = True
        source.allow_dml = False
        source.allow_run_async = False
        source.allow_ctas = False
        source.allow_cvas = False
        db.session.commit()


if __name__ == "__main__":
    main()
