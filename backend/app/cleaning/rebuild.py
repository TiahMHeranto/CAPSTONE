import logging

from psycopg import Connection

logger = logging.getLogger(__name__)

# Le schéma raw n'est pas modifié. Les labels et les identités ne sont pas lus.
STEPS = [
    """
    TRUNCATE
        clean.anomalies,
        clean.lignes_facture,
        clean.factures,
        clean.ordonnance_lignes,
        clean.ordonnances,
        clean.assures,
        clean.contrats,
        clean.prestataires,
        clean.referentiel_medicaments,
        clean.referentiel_actes
    """,
    """
    INSERT INTO clean.referentiel_actes (code_acte, libelle, categorie)
    SELECT code_acte, libelle, categorie
    FROM raw.referentiel_actes
    WHERE code_acte <> ''
      AND code_acte NOT IN (
          SELECT code_acte FROM raw.referentiel_actes
          GROUP BY code_acte HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.referentiel_medicaments (code_medicament, libelle, remboursable)
    SELECT code_medicament, libelle, remboursable = '1'
    FROM raw.referentiel_medicaments
    WHERE code_medicament <> ''
      AND code_medicament NOT IN (
          SELECT code_medicament FROM raw.referentiel_medicaments
          GROUP BY code_medicament HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.prestataires (prestataire_id, nom, type_prestataire, ville, statut)
    SELECT prestataire_id, nom, type_prestataire, NULLIF(ville, ''), NULLIF(statut, '')
    FROM raw.prestataires
    WHERE prestataire_id <> ''
      AND prestataire_id NOT IN (
          SELECT prestataire_id FROM raw.prestataires
          GROUP BY prestataire_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.contrats (contrat_id, formule, date_effet, date_fin, statut)
    SELECT contrat_id, NULLIF(formule, ''), clean.to_date(date_effet),
           clean.to_date(date_fin), NULLIF(statut, '')
    FROM raw.contrats
    WHERE contrat_id <> ''
      AND contrat_id NOT IN (
          SELECT contrat_id FROM raw.contrats GROUP BY contrat_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.assures (
        assure_id, contrat_id, sexe, tranche_age, ville, date_adhesion, date_radiation
    )
    SELECT clean.pseudo(assure_id), NULLIF(contrat_id, ''), NULLIF(sexe, ''),
           clean.tranche_age(
               clean.to_int(annee_naissance)::integer,
               current_setting('prediccare.age_reference')::integer
           ),
           NULLIF(ville, ''),
           clean.to_date(date_adhesion), clean.to_date(date_radiation)
    FROM raw.assures
    WHERE assure_id <> ''
      AND assure_id NOT IN (
          SELECT assure_id FROM raw.assures GROUP BY assure_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.ordonnances (
        ordonnance_id, assure_id, prescripteur_id, date_prescription, validite_jours
    )
    SELECT ordonnance_id, clean.pseudo(NULLIF(assure_id, '')), NULLIF(prescripteur_id, ''),
           clean.to_date(date_prescription), clean.to_int(validite_jours)::integer
    FROM raw.ordonnances
    WHERE ordonnance_id <> ''
      AND ordonnance_id NOT IN (
          SELECT ordonnance_id FROM raw.ordonnances
          GROUP BY ordonnance_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.ordonnance_lignes (ordonnance_id, num_ligne, code, quantite)
    SELECT DISTINCT ON (ligne.ordonnance_id, clean.to_int(ligne.num_ligne))
        ligne.ordonnance_id,
        clean.to_int(ligne.num_ligne)::integer,
        NULLIF(ligne.code, ''),
        clean.to_num(ligne.quantite)
    FROM raw.ordonnance_lignes AS ligne
    WHERE ligne.ordonnance_id IN (SELECT ordonnance_id FROM clean.ordonnances)
      AND clean.to_int(ligne.num_ligne) IS NOT NULL
    ORDER BY ligne.ordonnance_id, clean.to_int(ligne.num_ligne)
    """,
    """
    INSERT INTO clean.factures (
        facture_id, prestataire_id, assure_id, contrat_id, ordonnance_id, type_facture,
        date_soin, date_facture, date_reception, date_traitement, devise, nb_lignes,
        montant_total, montant_eligible, montant_pris_en_charge, reste_a_charge,
        statut, motif_rejet
    )
    SELECT facture_id, NULLIF(prestataire_id, ''), clean.pseudo(NULLIF(assure_id, '')),
           NULLIF(contrat_id, ''), NULLIF(ordonnance_id, ''), NULLIF(type_facture, ''),
           clean.to_date(date_soin), clean.to_date(date_facture),
           clean.to_date(date_reception), clean.to_date(date_traitement),
           NULLIF(devise, ''), clean.to_int(nb_lignes)::integer,
           clean.to_int(montant_total), clean.to_int(montant_eligible),
           clean.to_int(montant_pris_en_charge), clean.to_int(reste_a_charge),
           NULLIF(statut, ''), NULLIF(motif_rejet, '')
    FROM raw.factures
    WHERE facture_id <> ''
      AND clean.to_date(date_soin) IS NOT NULL
      AND clean.to_date(date_facture) IS NOT NULL
      AND clean.to_int(montant_total) IS NOT NULL
      AND clean.to_int(montant_total) >= 0
      AND facture_id NOT IN (
          SELECT facture_id FROM raw.factures
          WHERE facture_id <> ''
          GROUP BY facture_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT
        CASE
            WHEN facture_id IS NULL OR facture_id = '' THEN 'CHAMP_OBLIGATOIRE'
            WHEN facture_id IN (
                SELECT facture_id FROM raw.factures
                WHERE facture_id <> ''
                GROUP BY facture_id HAVING count(*) > 1
            ) THEN 'DOUBLON_CLE'
            WHEN coalesce(date_soin, '') = '' OR coalesce(date_facture, '') = ''
                THEN 'CHAMP_OBLIGATOIRE'
            WHEN clean.to_date(date_soin) IS NULL OR clean.to_date(date_facture) IS NULL
                THEN 'TYPE_INVALIDE'
            WHEN clean.to_int(montant_total) IS NULL THEN 'TYPE_INVALIDE'
            WHEN clean.to_int(montant_total) < 0 THEN 'MONTANT_NEGATIF'
            ELSE 'TYPE_INVALIDE'
        END,
        'rejet',
        'factures',
        NULLIF(facture_id, ''),
        'facture exclue du schema clean'
    FROM raw.factures AS source
    WHERE NOT EXISTS (
        SELECT 1 FROM clean.factures AS kept WHERE kept.facture_id = source.facture_id
    )
    """,
    """
    INSERT INTO clean.lignes_facture (
        ligne_id, facture_id, num_ligne, code, type_ligne, quantite, prix_unitaire, montant
    )
    SELECT ligne_id, facture_id, clean.to_int(num_ligne)::integer, code, type_ligne,
           clean.to_num(quantite), clean.to_int(prix_unitaire), clean.to_int(montant)
    FROM raw.lignes_facture
    WHERE ligne_id <> ''
      AND facture_id IN (SELECT facture_id FROM clean.factures)
      AND type_ligne IN ('ACTE', 'MEDICAMENT')
      AND clean.to_int(num_ligne) IS NOT NULL
      AND clean.to_num(quantite) IS NOT NULL
      AND clean.to_num(quantite) > 0
      AND clean.to_int(prix_unitaire) IS NOT NULL
      AND clean.to_int(prix_unitaire) >= 0
      AND clean.to_int(montant) IS NOT NULL
      AND clean.to_int(montant) >= 0
      AND ligne_id NOT IN (
          SELECT ligne_id FROM raw.lignes_facture
          WHERE ligne_id <> ''
          GROUP BY ligne_id HAVING count(*) > 1
      )
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT
        CASE
            WHEN ligne_id IS NULL OR ligne_id = '' THEN 'CHAMP_OBLIGATOIRE'
            WHEN ligne_id IN (
                SELECT ligne_id FROM raw.lignes_facture
                WHERE ligne_id <> ''
                GROUP BY ligne_id HAVING count(*) > 1
            ) THEN 'DOUBLON_CLE'
            WHEN facture_id NOT IN (SELECT facture_id FROM clean.factures)
                THEN 'LIGNE_SANS_FACTURE'
            WHEN type_ligne NOT IN ('ACTE', 'MEDICAMENT') THEN 'TYPE_LIGNE'
            WHEN clean.to_int(montant) < 0 OR clean.to_int(prix_unitaire) < 0
                OR coalesce(clean.to_num(quantite), 0) <= 0 THEN 'MONTANT_NEGATIF'
            ELSE 'TYPE_INVALIDE'
        END,
        'rejet',
        'lignes_facture',
        NULLIF(ligne_id, ''),
        'ligne exclue du schema clean'
    FROM raw.lignes_facture AS source
    WHERE NOT EXISTS (
        SELECT 1 FROM clean.lignes_facture AS kept WHERE kept.ligne_id = source.ligne_id
    )
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'CLE_INCONNUE', 'conservation', 'factures', facture_id, 'prestataire absent'
    FROM clean.factures
    WHERE prestataire_id IS NOT NULL
      AND prestataire_id NOT IN (SELECT prestataire_id FROM clean.prestataires)
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'CLE_INCONNUE', 'conservation', 'factures', facture_id, 'assure absent'
    FROM clean.factures
    WHERE assure_id IS NOT NULL
      AND assure_id NOT IN (SELECT assure_id FROM clean.assures)
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'CLE_INCONNUE', 'conservation', 'factures', facture_id, 'contrat absent'
    FROM clean.factures
    WHERE contrat_id IS NOT NULL
      AND contrat_id NOT IN (SELECT contrat_id FROM clean.contrats)
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'ORDONNANCE_INCONNUE', 'conservation', 'factures', facture_id,
           'ordonnance absente'
    FROM clean.factures
    WHERE ordonnance_id IS NOT NULL
      AND ordonnance_id NOT IN (SELECT ordonnance_id FROM clean.ordonnances)
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'CODE_INCONNU', 'conservation', 'lignes_facture', ligne_id, 'code hors referentiel'
    FROM clean.lignes_facture
    WHERE (type_ligne = 'ACTE' AND code NOT IN (SELECT code_acte FROM clean.referentiel_actes))
       OR (
           type_ligne = 'MEDICAMENT'
           AND code NOT IN (SELECT code_medicament FROM clean.referentiel_medicaments)
       )
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'MONTANT_LIGNES', 'conservation', 'factures', facture.facture_id,
           'somme des lignes differente du montant total'
    FROM clean.factures AS facture
    JOIN (
        SELECT facture_id, sum(montant) AS somme
        FROM clean.lignes_facture
        GROUP BY facture_id
    ) AS lignes ON lignes.facture_id = facture.facture_id
    WHERE lignes.somme <> facture.montant_total
    """,
    """
    INSERT INTO clean.anomalies (regle, decision, table_cible, identifiant, detail)
    SELECT 'DATES_INCOHERENTES', 'conservation', 'factures', facture_id,
           'ordre attendu: soin, facture, reception, traitement'
    FROM clean.factures
    WHERE date_facture < date_soin
       OR (date_reception IS NOT NULL AND date_reception < date_facture)
       OR (
           date_traitement IS NOT NULL
           AND date_traitement < coalesce(date_reception, date_facture)
       )
    """,
]


def rebuild_clean(connection: Connection) -> None:
    from app.config import settings

    connection.execute(
        """
        SELECT set_config('prediccare.pseudo_key', %s, true),
               set_config('prediccare.age_reference', %s, true)
        """,
        (settings.pseudo_hmac_key, str(settings.age_reference_year)),
    )
    for statement in STEPS:
        connection.execute(statement)
    counts = connection.execute(
        """
        SELECT
            (SELECT count(*) FROM clean.factures),
            (SELECT count(*) FROM clean.lignes_facture),
            (SELECT count(*) FROM clean.anomalies)
        """
    ).fetchone()
    logger.info(
        "clean reconstruit factures=%s lignes=%s anomalies=%s",
        counts[0],
        counts[1],
        counts[2],
    )


def main() -> None:
    from app.config import settings
    from app.core.logging import configure_logging

    configure_logging()
    with psycopg_connect(settings.psycopg_migrate_url) as connection:
        rebuild_clean(connection)
        connection.commit()


def psycopg_connect(url: str):
    import psycopg

    return psycopg.connect(url)


if __name__ == "__main__":
    main()
