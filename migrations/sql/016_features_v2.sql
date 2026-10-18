-- Colonnes lues par le pipeline v2. Ce ne sont pas des identités.

ALTER TABLE clean.prestataires ADD COLUMN IF NOT EXISTS date_fin_convention date;
ALTER TABLE clean.prestataires ADD COLUMN IF NOT EXISTS jours_ouverture text;
ALTER TABLE clean.referentiel_actes ADD COLUMN IF NOT EXISTS tarif_reference integer;
ALTER TABLE clean.referentiel_actes ADD COLUMN IF NOT EXISTS tarif_max integer;

UPDATE clean.prestataires AS cible
SET date_fin_convention = clean.to_date(source.date_fin_convention),
    jours_ouverture = NULLIF(source.jours_ouverture, '')
FROM raw.prestataires AS source
WHERE cible.prestataire_id = source.prestataire_id;

UPDATE clean.referentiel_actes AS acte
SET tarif_reference = clean.to_int(source.tarif_reference)::integer,
    tarif_max = clean.to_int(source.tarif_max)::integer
FROM raw.referentiel_actes AS source
WHERE acte.code_acte = source.code_acte;
