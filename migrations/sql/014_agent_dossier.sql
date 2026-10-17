-- Vues du dossier et rôle lecture seule pour le SQL proposé par l'assistant.
-- security_invoker : les politiques du rôle appelant s'appliquent aux tables.

CREATE OR REPLACE VIEW clean.dossier_factures
WITH (security_invoker = true) AS
SELECT facture_id, prestataire_id, ordonnance_id, type_facture,
       date_soin, date_facture, montant_total, montant_pris_en_charge,
       reste_a_charge, statut, motif_rejet
FROM clean.factures
UNION ALL
SELECT facture_id, prestataire_id, ordonnance_id, type_facture,
       date_soin, date_facture, montant_total, montant_pris_en_charge,
       reste_a_charge, statut, motif_rejet
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
SELECT ordonnance_id, prescripteur_id, date_prescription, validite_jours
FROM clean.ordonnances;

CREATE OR REPLACE VIEW clean.dossier_ordonnance_lignes
WITH (security_invoker = true) AS
SELECT ordonnance_id, num_ligne, code, quantite
FROM clean.ordonnance_lignes;

GRANT USAGE ON SCHEMA app TO prediccare_agent;
GRANT SELECT ON TABLE app.factures, app.lignes_facture TO prediccare_agent;
GRANT SELECT ON TABLE
    clean.ordonnance_lignes,
    clean.prestataires,
    clean.referentiel_actes,
    clean.referentiel_medicaments,
    clean.dossier_factures,
    clean.dossier_lignes,
    clean.dossier_ordonnances,
    clean.dossier_ordonnance_lignes
TO prediccare_agent;

ALTER ROLE prediccare_agent SET statement_timeout = '10s';

ALTER TABLE clean.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.lignes_facture ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.ordonnances ENABLE ROW LEVEL SECURITY;
ALTER TABLE clean.ordonnance_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.lignes_facture ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS agent_assure ON clean.lignes_facture;
CREATE POLICY agent_assure ON clean.lignes_facture
    FOR SELECT TO prediccare_agent
    USING (
        EXISTS (
            SELECT 1 FROM clean.factures AS facture
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

DROP POLICY IF EXISTS app_lecture ON clean.ordonnance_lignes;
CREATE POLICY app_lecture ON clean.ordonnance_lignes
    FOR SELECT TO prediccare_app
    USING (true);

DROP POLICY IF EXISTS agent_assure ON clean.ordonnance_lignes;
CREATE POLICY agent_assure ON clean.ordonnance_lignes
    FOR SELECT TO prediccare_agent
    USING (
        EXISTS (
            SELECT 1 FROM clean.ordonnances AS ordonnance
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
            SELECT 1 FROM app.factures AS facture
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
