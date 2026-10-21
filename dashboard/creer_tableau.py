"""Crée le tableau de bord Pilotage sur les vues du schéma bi. Relançable."""

import json
import os

from superset.app import create_app

SOURCE = "PrediCare BI"
TITRE = "Pilotage PrediCare"
SLUG = "pilotage"

VUES = ("volumes", "alertes_par_statut", "decisions_humaines", "distribution_scores")

LIBELLES = {
    "volumes": {
        "nb_factures": "Volumes traités",
        "nb_predictions": "Prédictions",
        "nb_alertes_modele": "Alertes du modèle",
        "nb_normales": "Factures normales",
        "nb_notifications": "Notifications",
        "nb_decisions": "Décisions humaines",
        "nb_rejets": "Rejets journalisés",
        "montant_economise": "Montant économisé",
        "taux_detection": "Taux de détection",
    },
    "alertes_par_statut": {
        "canal": "Canal",
        "statut": "Statut",
        "nb": "Notifications",
        "derniere": "Dernière notification",
    },
    "decisions_humaines": {
        "facture_id": "Facture",
        "decision": "Décision",
        "created_at": "Date",
        "score": "Score",
        "classe": "Classe",
        "model_version": "Version du modèle",
    },
    "distribution_scores": {
        "model_version": "Version du modèle",
        "tranche": "Tranche de score",
        "nb": "Factures",
    },
}


def metrique(expression: str, libelle: str) -> dict:
    return {
        "expressionType": "SQL",
        "sqlExpression": expression,
        "label": libelle,
        "hasCustomLabel": True,
    }


def requete(colonnes: list, mesures: list, limite: int = 100) -> dict:
    return {
        "filters": [],
        "extras": {"having": "", "where": ""},
        "applied_time_extras": {},
        "columns": colonnes,
        "metrics": mesures,
        "annotation_layers": [],
        "row_limit": limite,
        "series_limit": 0,
        "order_desc": True,
        "url_params": {},
        "custom_params": {},
        "custom_form_data": {},
    }


def contexte(source_id: int, formulaire: dict, requetes: list) -> dict:
    return {
        "datasource": {"id": source_id, "type": "table"},
        "force": False,
        "queries": requetes,
        "form_data": formulaire,
        "result_format": "json",
        "result_type": "full",
    }


def main() -> None:
    application = create_app()
    with application.app_context():
        from flask import g
        from flask_appbuilder.security.sqla.models import User

        from superset import db
        from superset.commands.chart.data.get_data_command import ChartDataCommand
        from superset.common.query_context_factory import QueryContextFactory
        from superset.connectors.sqla.models import SqlaTable
        from superset.models.core import Database
        from superset.models.dashboard import Dashboard
        from superset.models.slice import Slice

        source = db.session.query(Database).filter_by(database_name=SOURCE).one()
        admin = (
            db.session.query(User)
            .filter_by(username=os.environ["SUPERSET_ADMIN_USERNAME"])
            .one()
        )
        g.user = admin
        jeux = {nom: jeu(db, source, admin, nom) for nom in VUES}
        definitions = graphiques(jeux)
        parts = []
        for definition in definitions:
            part = enregistrer(db, Slice, definition, admin)
            parts.append(part)
        db.session.commit()
        verifier(ChartDataCommand, QueryContextFactory, parts)
        tableau(db, Dashboard, parts, admin)
        db.session.commit()
        print(f"tableau {SLUG} pret, {len(parts)} graphiques")


def jeu(db, source, admin, nom: str):
    from superset.connectors.sqla.models import SqlaTable

    existant = (
        db.session.query(SqlaTable)
        .filter_by(database_id=source.id, schema="bi", table_name=nom)
        .one_or_none()
    )
    if existant is None:
        existant = SqlaTable(table_name=nom, schema="bi", database=source)
        db.session.add(existant)
        db.session.commit()
    existant.owners = [admin]
    existant.fetch_metadata()
    for colonne in existant.columns:
        libelle = LIBELLES.get(nom, {}).get(colonne.column_name)
        if libelle:
            colonne.verbose_name = libelle
    db.session.commit()
    return existant


def graphiques(jeux: dict) -> list[dict]:
    volumes = jeux["volumes"].id
    alertes = jeux["alertes_par_statut"].id
    decisions = jeux["decisions_humaines"].id
    scores = jeux["distribution_scores"].id
    return [
        chiffre(volumes, "Volumes traités", "MAX(nb_factures)", "Factures déposées", ",d"),
        chiffre(
            volumes,
            "Montant économisé",
            "MAX(montant_economise)",
            "Somme des rejets humains, MGA",
            ",.0f",
        ),
        chiffre(
            volumes,
            "Taux de détection",
            "MAX(taux_detection)",
            "Part des factures scorées en alerte",
            ".2%",
        ),
        chiffre(volumes, "Alertes du modèle", "MAX(nb_alertes_modele)", "Classe alerte", ",d"),
        chiffre(volumes, "Décisions humaines", "MAX(nb_decisions)", "Valider, rejeter ou complément", ",d"),
        chiffre(volumes, "Notifications", "MAX(nb_notifications)", "Alertes envoyées", ",d"),
        {
            "nom": "Répartition des scores",
            "viz": "echarts_timeseries_bar",
            "source": scores,
            "formulaire": {
                "viz_type": "echarts_timeseries_bar",
                "x_axis": "tranche",
                "metrics": [metrique("SUM(nb)", "Factures")],
                "groupby": ["model_version"],
                "row_limit": 100,
                "show_legend": True,
                "y_axis_format": ",d",
                "color_scheme": "supersetColors",
            },
            "requetes": [
                requete(
                    ["tranche", "model_version"],
                    [metrique("SUM(nb)", "Factures")],
                )
            ],
        },
        {
            "nom": "Décisions humaines par type",
            "viz": "pie",
            "source": decisions,
            "formulaire": {
                "viz_type": "pie",
                "metric": metrique("COUNT(*)", "Décisions"),
                "groupby": ["decision"],
                "row_limit": 10,
                "show_legend": True,
                "color_scheme": "supersetColors",
                "number_format": ",d",
            },
            "requetes": [requete(["decision"], [metrique("COUNT(*)", "Décisions")])],
        },
        {
            "nom": "Alertes par statut",
            "viz": "echarts_timeseries_bar",
            "source": alertes,
            "formulaire": {
                "viz_type": "echarts_timeseries_bar",
                "x_axis": "statut",
                "metrics": [metrique("SUM(nb)", "Notifications")],
                "groupby": ["canal"],
                "row_limit": 100,
                "show_legend": True,
                "y_axis_format": ",d",
                "color_scheme": "supersetColors",
            },
            "requetes": [
                requete(
                    ["statut", "canal"],
                    [metrique("SUM(nb)", "Notifications")],
                )
            ],
        },
        {
            "nom": "Dernières décisions",
            "viz": "table",
            "source": decisions,
            "formulaire": {
                "viz_type": "table",
                "query_mode": "raw",
                "all_columns": [
                    "facture_id",
                    "decision",
                    "created_at",
                    "score",
                    "classe",
                    "model_version",
                ],
                "percent_metrics": [],
                "row_limit": 50,
                "include_search": True,
                "show_cell_bars": False,
                "server_pagination": False,
                "order_desc": True,
            },
            "requetes": [
                {
                    **requete(
                        [
                            "facture_id",
                            "decision",
                            "created_at",
                            "score",
                            "classe",
                            "model_version",
                        ],
                        [],
                        50,
                    ),
                    "orderby": [["created_at", False]],
                }
            ],
        },
    ]


def chiffre(source: int, nom: str, expression: str, sous_titre: str, format_nombre: str) -> dict:
    mesure = metrique(expression, nom)
    return {
        "nom": nom,
        "viz": "big_number_total",
        "source": source,
        "formulaire": {
            "viz_type": "big_number_total",
            "metric": mesure,
            "subheader": sous_titre,
            "y_axis_format": format_nombre,
            "header_font_size": 0.4,
        },
        "requetes": [requete([], [mesure], 1)],
    }


def enregistrer(db, slice_modele, definition: dict, admin) -> dict:
    formulaire = {
        **definition["formulaire"],
        "datasource": f"{definition['source']}__table",
    }
    existant = (
        db.session.query(slice_modele).filter_by(slice_name=definition["nom"]).one_or_none()
    )
    if existant is None:
        existant = slice_modele(slice_name=definition["nom"])
        db.session.add(existant)
    existant.viz_type = definition["viz"]
    existant.datasource_id = definition["source"]
    existant.datasource_type = "table"
    existant.owners = [admin]
    existant.params = json.dumps(formulaire, ensure_ascii=False)
    db.session.flush()
    formulaire["slice_id"] = existant.id
    existant.params = json.dumps(formulaire, ensure_ascii=False)
    existant.query_context = json.dumps(
        contexte(definition["source"], formulaire, definition["requetes"]),
        ensure_ascii=False,
    )
    return {"slice": existant, "formulaire": formulaire, "requetes": definition["requetes"]}


def verifier(commande, fabrique, parts: list) -> None:
    usine = fabrique()
    for part in parts:
        formulaire = part["formulaire"]
        try:
            resultat = commande(
                usine.create(
                    datasource={"id": formulaire["datasource"].split("__")[0], "type": "table"},
                    queries=part["requetes"],
                    form_data=formulaire,
                )
            ).run()
        except Exception as erreur:  # noqa: BLE001 — un graphique illisible doit échouer ici
            raise RuntimeError(f"{part['slice'].slice_name}: {erreur}") from erreur
        lignes = resultat["queries"][0].get("data") or []
        print(f"{part['slice'].slice_name}: {len(lignes)} ligne(s)")


def tableau(db, dashboard_modele, parts: list, admin) -> None:
    existant = db.session.query(dashboard_modele).filter_by(slug=SLUG).one_or_none()
    if existant is None:
        existant = dashboard_modele(dashboard_title=TITRE, slug=SLUG)
        db.session.add(existant)
    existant.dashboard_title = TITRE
    existant.published = True
    existant.description = (
        "Volumes traités, montants économisés et taux de détection. "
        "Le montant économisé additionne les factures dont la dernière décision humaine est un rejet. "
        "Le taux de détection est la part des factures scorées classées en alerte."
    )
    existant.owners = [admin]
    existant.slices = [part["slice"] for part in parts]
    existant.json_metadata = json.dumps(
        {
            "color_scheme": "supersetColors",
            "refresh_frequency": 0,
            "expanded_slices": {},
            "label_colors": {},
            "timed_refresh_immune_slices": [],
            "cross_filters_enabled": False,
            "chart_configuration": {},
            "native_filter_configuration": [],
        },
        ensure_ascii=False,
    )
    existant.position_json = json.dumps(positions(parts), ensure_ascii=False)


def positions(parts: list) -> dict:
    lignes = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7],
        [8, 9],
    ]
    hauteurs = {0: 34, 1: 34, 2: 34, 3: 34, 4: 34, 5: 34, 6: 56, 7: 56, 8: 50, 9: 50}
    largeurs = {6: 7, 7: 5, 8: 6, 9: 6}
    grille = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
        "GRID_ID": {
            "type": "GRID",
            "id": "GRID_ID",
            "children": [],
            "parents": ["ROOT_ID"],
        },
    }
    for index, groupe in enumerate(lignes):
        ligne = f"ROW-{index}"
        grille["GRID_ID"]["children"].append(ligne)
        grille[ligne] = {
            "type": "ROW",
            "id": ligne,
            "children": [],
            "parents": ["ROOT_ID", "GRID_ID"],
            "meta": {"background": "BACKGROUND_TRANSPARENT"},
        }
        for rang in groupe:
            part = parts[rang]
            identifiant = f"CHART-{part['slice'].id}"
            largeur = largeurs.get(rang, 4)
            grille[ligne]["children"].append(identifiant)
            grille[identifiant] = {
                "type": "CHART",
                "id": identifiant,
                "children": [],
                "parents": ["ROOT_ID", "GRID_ID", ligne],
                "meta": {
                    "width": largeur,
                    "height": hauteurs[rang],
                    "chartId": part["slice"].id,
                    "sliceName": part["slice"].slice_name,
                },
            }
    return grille


if __name__ == "__main__":
    main()
