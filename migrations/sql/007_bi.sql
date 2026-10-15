-- Vues en lecture pour le tableau de bord. Agrégats et décisions humaines.
-- Aucune colonne de labels ni d'identité : le score n'est pas une sanction.

CREATE SCHEMA IF NOT EXISTS bi;
REVOKE ALL ON SCHEMA bi FROM PUBLIC;

CREATE OR REPLACE VIEW bi.volumes AS
SELECT
    (SELECT count(*) FROM app.factures) AS nb_factures,
    (SELECT count(*) FROM app.predictions) AS nb_predictions,
    (SELECT count(*) FROM app.predictions WHERE classe = 'alerte') AS nb_alertes_modele,
    (SELECT count(*) FROM app.predictions WHERE classe = 'normale') AS nb_normales,
    (SELECT count(*) FROM app.alertes) AS nb_notifications,
    (SELECT count(*) FROM app.decisions) AS nb_decisions,
    (SELECT count(*) FROM app.audit_log WHERE action = 'rejet_facture') AS nb_rejets;

CREATE OR REPLACE VIEW bi.alertes_par_statut AS
SELECT
    canal,
    statut,
    count(*) AS nb,
    max(created_at) AS derniere
FROM app.alertes
GROUP BY canal, statut;

CREATE OR REPLACE VIEW bi.decisions_humaines AS
SELECT
    decision.facture_id,
    decision.decision,
    decision.acteur,
    decision.created_at,
    prediction.score,
    prediction.classe,
    prediction.model_version
FROM app.decisions AS decision
LEFT JOIN app.predictions AS prediction
    ON prediction.id = decision.prediction_id;

CREATE OR REPLACE VIEW bi.distribution_scores AS
SELECT model_version, tranche, count(*) AS nb
FROM (
    SELECT
        model_version,
        CASE
            WHEN score < 0.25 THEN '0-0.25'
            WHEN score < 0.5 THEN '0.25-0.5'
            WHEN score < 0.75 THEN '0.5-0.75'
            ELSE '0.75-1'
        END AS tranche
    FROM app.predictions
) AS scores
GROUP BY model_version, tranche;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT USAGE ON SCHEMA bi TO prediccare_app;
        GRANT SELECT ON ALL TABLES IN SCHEMA bi TO prediccare_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_bi') THEN
        GRANT USAGE ON SCHEMA bi TO prediccare_bi;
        GRANT SELECT ON ALL TABLES IN SCHEMA bi TO prediccare_bi;
    END IF;
END $$;
