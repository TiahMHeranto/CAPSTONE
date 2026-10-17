-- Rang et assuré principal, pseudonymisé comme assure_id.

ALTER TABLE clean.assures ADD COLUMN IF NOT EXISTS rang_beneficiaire text;
ALTER TABLE clean.assures ADD COLUMN IF NOT EXISTS assure_principal_id text;
