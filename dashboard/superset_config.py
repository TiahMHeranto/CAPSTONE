"""Réglages Superset. Le secret vient de l'environnement, pas du dépôt."""

import os

SECRET_KEY = os.environ["SUPERSET_SECRET_KEY"]
SQLALCHEMY_DATABASE_URI = "sqlite:////app/superset_home/superset.db"
WTF_CSRF_ENABLED = True
FEATURE_FLAGS = {"ALERT_REPORTS": False}
