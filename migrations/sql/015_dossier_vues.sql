-- Vues du dossier pour l'assistant. security_invoker : le rôle appelant
-- reste soumis aux politiques. L'administrateur passe par prediccare_app,
-- dont la politique de lecture est ouverte.

CREATE OR REPLACE VIEW clean.dossier_factures
WITH (security_invoker = true) AS
SELECT facture_id, assure_id, prestataire_id, ordonnance_id, contrat_id,
       type_facture, date_soin, date_facture, montant_total,
       montant_pris_en_charge, reste_a_charge, statut, motif_rejet
FROM clean.factures
UNION ALL
SELECT facture_id, assure_id, prestataire_id, ordonnance_id, contrat_id,
       type_facture, date_soin, date_facture, montant_total,
       montant_pris_en_charge, reste_a_charge, statut, motif_rejet
FROM app.factures;

CREATE OR REPLACE VIEW clean.dossier_lignes
WITH (security_invoker = true) AS
SELECT facture_id, num_ligne, code, type_ligne, quantite, prix_unitaire, montant
FROM clean.lignes_facture
UNION ALL
SELECT facture_id, num_ligne, code, type_ligne, quantite, prix_unitaire, montant
FROM app.lignes_facture;

CREATE OR REPLACE VIEW clean.dossier_ordonnances
WITH (security_invoker = true) AS
SELECT ordonnance_id, assure_id, prescripteur_id, date_prescription, validite_jours
FROM clean.ordonnances;

CREATE OR REPLACE VIEW clean.dossier_ordonnance_lignes
WITH (security_invoker = true) AS
SELECT ordonnance_id, num_ligne, code, quantite
FROM clean.ordonnance_lignes;

CREATE OR REPLACE VIEW clean.dossier_assures
WITH (security_invoker = true) AS
SELECT assure_id, contrat_id, rang_beneficiaire, sexe, tranche_age,
       ville, date_adhesion, date_radiation
FROM clean.assures;

CREATE OR REPLACE VIEW clean.dossier_contrats
WITH (security_invoker = true) AS
SELECT contrat_id, formule, date_effet, date_fin, statut
FROM clean.contrats;

GRANT SELECT ON TABLE
    clean.dossier_factures,
    clean.dossier_lignes,
    clean.dossier_ordonnances,
    clean.dossier_ordonnance_lignes,
    clean.dossier_assures,
    clean.dossier_contrats
TO prediccare_app, prediccare_agent;

GRANT USAGE ON SCHEMA app TO prediccare_agent;
GRANT SELECT ON TABLE app.factures, app.lignes_facture TO prediccare_agent;
GRANT SELECT ON TABLE
    clean.ordonnance_lignes,
    clean.prestataires,
    clean.referentiel_actes,
    clean.referentiel_medicaments,
    clean.contrats
TO prediccare_agent;

ALTER ROLE prediccare_agent SET statement_timeout = '10s';

ALTER TABLE clean.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.lignes_facture ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.ordonnance_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.assures ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.lignes_facture ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_lecture ON clean.contrats;
CREATE POLICY app_lecture ON clean.contrats
    FOR SELECT TO prediccare_app
    USING (true);

DROP POLICY IF EXISTS agent_assure ON clean.contrats;
CREATE POLICY agent_assure ON clean.contrats
    FOR SELECT TO prediccare_agent
    USING (
        contrat_id IN (
            SELECT assure.contrat_id
            FROM clean.assures AS assure
            WHERE assure.assure_id = current_setting('prediccare.assure_id', true)
        )
    );

DROP POLICY IF EXISTS app_lecture ON clean.ordonnance_lignes;
CREATE POLICY app_lecture ON clean.ordonnance_lignes
    FOR SELECT TO prediccare_app
    USING (true);

DROP POLICY IF EXISTS agent_assure ON clean.factures;
CREATE POLICY agent_assure ON clean.factures
    FOR SELECT TO prediccare_agent
    USING (
        (
            nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
            AND assure_id = current_setting('prediccare.assure_id', true)
        )
        OR (
            nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
            AND prestataire_id = current_setting('prediccare.prestataire_id', true)
        )
    );

DROP POLICY IF EXISTS agent_assure ON clean.ordonnances;
CREATE POLICY agent_assure ON clean.ordonnances
    FOR SELECT TO prediccare_agent
    USING (
        (
            nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
            AND assure_id = current_setting('prediccare.assure_id', true)
        )
        OR (
            nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
            AND prescripteur_id = current_setting('prediccare.prestataire_id', true)
        )
    );

DROP POLICY IF EXISTS agent_assure ON clean.lignes_facture;
CREATE POLICY agent_assure ON clean.lignes_facture
    FOR SELECT TO prediccare_agent
    USING (
        EXISTS (
            SELECT 1
            FROM clean.factures AS facture
            WHERE facture.facture_id = lignes_facture.facture_id
              AND (
                  (
                      nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
                      AND facture.assure_id = current_setting('prediccare.assure_id', true)
                  )
                  OR (
                      nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
                      AND facture.prestataire_id = current_setting(
                          'prediccare.prestataire_id', true
                      )
                  )
              )
        )
    );

DROP POLICY IF EXISTS agent_assure ON clean.ordonnance_lignes;
CREATE POLICY agent_assure ON clean.ordonnance_lignes
    FOR SELECT TO prediccare_agent
    USING (
        EXISTS (
            SELECT 1
            FROM clean.ordonnances AS ordonnance
            WHERE ordonnance.ordonnance_id = ordonnance_lignes.ordonnance_id
              AND (
                  (
                      nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
                      AND ordonnance.assure_id = current_setting('prediccare.assure_id', true)
                  )
                  OR (
                      nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
                      AND ordonnance.prescripteur_id = current_setting(
                          'prediccare.prestataire_id', true
                      )
                  )
              )
        )
    );

DROP POLICY IF EXISTS app_tout ON app.factures;
CREATE POLICY app_tout ON app.factures
    FOR ALL TO prediccare_app
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS agent_assure ON app.factures;
CREATE POLICY agent_assure ON app.factures
    FOR SELECT TO prediccare_agent
    USING (
        (
            nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
            AND assure_id = current_setting('prediccare.assure_id', true)
        )
        OR (
            nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
            AND prestataire_id = current_setting('prediccare.prestataire_id', true)
        )
    );

DROP POLICY IF EXISTS app_tout ON app.lignes_facture;
CREATE POLICY app_tout ON app.lignes_facture
    FOR ALL TO prediccare_app
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS agent_assure ON app.lignes_facture;
CREATE POLICY agent_assure ON app.lignes_facture
    FOR SELECT TO prediccare_agent
    USING (
        EXISTS (
            SELECT 1
            FROM app.factures AS facture
            WHERE facture.facture_id = lignes_facture.facture_id
              AND (
                  (
                      nullif(current_setting('prediccare.assure_id', true), '') IS NOT NULL
                      AND facture.assure_id = current_setting('prediccare.assure_id', true)
                  )
                  OR (
                      nullif(current_setting('prediccare.prestataire_id', true), '') IS NOT NULL
                      AND facture.prestataire_id = current_setting(
                          'prediccare.prestataire_id', true
                      )
                  )
              )
        )
    );
