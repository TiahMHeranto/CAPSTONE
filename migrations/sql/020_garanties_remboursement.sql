-- Le barème lu à la validation vient de la cohorte, dans un schéma que l'API peut lire.

INSERT INTO app.garanties (
    formule, categorie, taux_remboursement, plafond_annuel_categorie,
    franchise_par_facture, delai_carence_jours, plafond_annuel_global,
    attestation_requise, actes_exclus
)
SELECT
    formule,
    categorie,
    NULLIF(taux_remboursement, '')::numeric,
    NULLIF(plafond_annuel_categorie, '')::integer,
    COALESCE(NULLIF(franchise_par_facture, '')::integer, 0),
    COALESCE(NULLIF(delai_carence_jours, '')::integer, 0),
    NULLIF(plafond_annuel_global, '')::integer,
    COALESCE(attestation_requise, '0') IN ('1', 'true', 't', 'TRUE'),
    NULLIF(actes_exclus, '')
FROM raw.garanties
WHERE NULLIF(formule, '') IS NOT NULL
  AND NULLIF(categorie, '') IS NOT NULL
  AND NULLIF(taux_remboursement, '') IS NOT NULL
ON CONFLICT (formule, categorie) DO UPDATE SET
    taux_remboursement = EXCLUDED.taux_remboursement,
    plafond_annuel_categorie = EXCLUDED.plafond_annuel_categorie,
    franchise_par_facture = EXCLUDED.franchise_par_facture,
    delai_carence_jours = EXCLUDED.delai_carence_jours,
    plafond_annuel_global = EXCLUDED.plafond_annuel_global,
    attestation_requise = EXCLUDED.attestation_requise,
    actes_exclus = EXCLUDED.actes_exclus;
