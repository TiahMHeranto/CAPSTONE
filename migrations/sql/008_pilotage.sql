-- Lignes d'ordonnance lisibles au dépôt, sans diagnostic d'un assuré.
-- Le diagnostic reste dans raw. La fonction ne renvoie qu'un booléen.

CREATE TABLE IF NOT EXISTS clean.ordonnance_lignes (
    ordonnance_id text NOT NULL,
    num_ligne integer NOT NULL,
    code text,
    quantite numeric,
    PRIMARY KEY (ordonnance_id, num_ligne)
);

INSERT INTO clean.ordonnance_lignes (ordonnance_id, num_ligne, code, quantite)
SELECT DISTINCT ON (ligne.ordonnance_id, clean.to_int(ligne.num_ligne))
    ligne.ordonnance_id,
    clean.to_int(ligne.num_ligne)::integer,
    NULLIF(ligne.code, ''),
    clean.to_num(ligne.quantite)
FROM raw.ordonnance_lignes AS ligne
WHERE ligne.ordonnance_id IN (SELECT ordonnance_id FROM clean.ordonnances)
  AND clean.to_int(ligne.num_ligne) IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM clean.ordonnance_lignes AS deja
      WHERE deja.ordonnance_id = ligne.ordonnance_id
        AND deja.num_ligne = clean.to_int(ligne.num_ligne)::integer
  )
ORDER BY ligne.ordonnance_id, clean.to_int(ligne.num_ligne);

CREATE TABLE IF NOT EXISTS clean.correspondance_diagnostic (
    diagnostic text NOT NULL,
    specialite text NOT NULL,
    PRIMARY KEY (diagnostic, specialite)
);

INSERT INTO clean.correspondance_diagnostic (diagnostic, specialite) VALUES
    ('Infection respiratoire aiguë', 'PNEUMOLOGIE'),
    ('Infection respiratoire aiguë', 'ORL'),
    ('Infection respiratoire aiguë', 'GENERALISTE'),
    ('Infection respiratoire aiguë', 'URGENCE'),
    ('Infection respiratoire aiguë', 'PEDIATRIE'),
    ('Hypertension artérielle', 'CARDIOLOGIE'),
    ('Hypertension artérielle', 'GENERALISTE'),
    ('Hypertension artérielle', 'NEPHROLOGIE'),
    ('Paludisme simple', 'GENERALISTE'),
    ('Paludisme simple', 'URGENCE'),
    ('Paludisme simple', 'PEDIATRIE'),
    ('Gastro-entérite', 'GASTRO-ENTEROLOGIE'),
    ('Gastro-entérite', 'GENERALISTE'),
    ('Gastro-entérite', 'PEDIATRIE'),
    ('Gastro-entérite', 'URGENCE'),
    ('Infection urinaire', 'UROLOGIE'),
    ('Infection urinaire', 'GENERALISTE'),
    ('Infection urinaire', 'GYNECOLOGIE'),
    ('Diabète de type 2', 'ENDOCRINOLOGIE'),
    ('Diabète de type 2', 'GENERALISTE'),
    ('Diabète de type 2', 'OPHTALMOLOGIE'),
    ('Diabète de type 2', 'NEPHROLOGIE'),
    ('Diabète de type 2', 'CARDIOLOGIE'),
    ('Traumatisme / entorse', 'TRAUMATO-ORTHOPEDIE'),
    ('Traumatisme / entorse', 'URGENCE'),
    ('Traumatisme / entorse', 'GENERALISTE'),
    ('Traumatisme / entorse', 'RHUMATOLOGIE'),
    ('Dyslipidémie', 'ENDOCRINOLOGIE'),
    ('Dyslipidémie', 'CARDIOLOGIE'),
    ('Dyslipidémie', 'GENERALISTE'),
    ('Asthme', 'PNEUMOLOGIE'),
    ('Asthme', 'GENERALISTE'),
    ('Asthme', 'PEDIATRIE'),
    ('Asthme', 'URGENCE'),
    ('Lombalgie', 'RHUMATOLOGIE'),
    ('Lombalgie', 'GENERALISTE'),
    ('Lombalgie', 'TRAUMATO-ORTHOPEDIE'),
    ('Lombalgie', 'NEUROLOGIE'),
    ('Rhinite allergique', 'ORL'),
    ('Rhinite allergique', 'GENERALISTE'),
    ('Rhinite allergique', 'PNEUMOLOGIE'),
    ('Céphalées', 'NEUROLOGIE'),
    ('Céphalées', 'GENERALISTE'),
    ('Céphalées', 'ORL'),
    ('Céphalées', 'OPHTALMOLOGIE'),
    ('Gastrite', 'GASTRO-ENTEROLOGIE'),
    ('Gastrite', 'GENERALISTE'),
    ('Dermatose', 'DERMATOLOGIE'),
    ('Dermatose', 'GENERALISTE'),
    ('Suivi de grossesse', 'GYNECOLOGIE'),
    ('Suivi de grossesse', 'GENERALISTE'),
    ('Trouble de la réfraction', 'OPHTALMOLOGIE'),
    ('Insuffisance rénale chronique', 'NEPHROLOGIE'),
    ('Insuffisance rénale chronique', 'GENERALISTE'),
    ('Trouble anxieux', 'PSYCHIATRIE'),
    ('Trouble anxieux', 'GENERALISTE'),
    ('Trouble anxieux', 'NEUROLOGIE')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION clean.diagnostic_incompatible(p_ordonnance text, p_codes text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, raw, clean
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM raw.ordonnances AS ordonnance
        JOIN raw.referentiel_actes AS acte ON acte.code_acte = ANY(p_codes)
        WHERE ordonnance.ordonnance_id = p_ordonnance
          AND EXISTS (
              SELECT 1 FROM clean.correspondance_diagnostic AS connu
              WHERE connu.diagnostic = ordonnance.diagnostic
          )
          AND coalesce(acte.specialite, '') <> ''
          AND NOT EXISTS (
              SELECT 1 FROM clean.correspondance_diagnostic AS attendu
              WHERE attendu.diagnostic = ordonnance.diagnostic
                AND attendu.specialite = acte.specialite
          )
    );
$$;

REVOKE ALL ON FUNCTION clean.diagnostic_incompatible(text, text[]) FROM PUBLIC;

CREATE TABLE IF NOT EXISTS app.anomalies_prescription (
    id bigserial PRIMARY KEY,
    facture_id text NOT NULL,
    code text NOT NULL,
    motif text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW bi.volumes AS
SELECT
    (SELECT count(*) FROM app.factures) AS nb_factures,
    (SELECT count(*) FROM app.predictions) AS nb_predictions,
    (SELECT count(*) FILTER (WHERE classe = 'alerte') FROM app.predictions) AS nb_alertes_modele,
    (SELECT count(*) FILTER (WHERE classe = 'normale') FROM app.predictions) AS nb_normales,
    (SELECT count(*) FROM app.alertes) AS nb_notifications,
    (SELECT count(*) FROM app.decisions) AS nb_decisions,
    (SELECT count(*) FROM app.audit_log WHERE action = 'rejet_facture') AS nb_rejets,
    (
        SELECT coalesce(sum(facture.montant_total), 0)
        FROM app.factures AS facture
        JOIN app.decisions AS decision ON decision.facture_id = facture.facture_id
        WHERE decision.decision = 'rejeter'
          AND decision.id = (
              SELECT max(dernier.id) FROM app.decisions AS dernier
              WHERE dernier.facture_id = facture.facture_id
          )
    ) AS montant_economise,
    (
        SELECT CASE
            WHEN count(*) = 0 THEN 0
            ELSE round(count(*) FILTER (WHERE classe = 'alerte')::numeric / count(*), 4)
        END
        FROM app.predictions
    ) AS taux_detection;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_app') THEN
        GRANT SELECT ON clean.ordonnance_lignes TO prediccare_app;
        GRANT SELECT ON clean.correspondance_diagnostic TO prediccare_app;
        GRANT EXECUTE ON FUNCTION clean.diagnostic_incompatible(text, text[]) TO prediccare_app;
        GRANT SELECT, INSERT ON app.anomalies_prescription TO prediccare_app;
        GRANT USAGE, SELECT ON SEQUENCE app.anomalies_prescription_id_seq TO prediccare_app;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prediccare_bi') THEN
        GRANT SELECT ON bi.volumes TO prediccare_bi;
    END IF;
END $$;
