import { z } from "zod";

export const ligneSchema = z.object({
  code: z.string().trim().min(1).max(64),
  type_ligne: z.enum(["ACTE", "MEDICAMENT"]),
  quantite: z.number().positive(),
  prix_unitaire: z.number().int().nonnegative(),
  montant: z.number().int().nonnegative(),
});

export const factureSchema = z.object({
  facture_id: z.string().trim().min(1).max(64),
  type_facture: z.string().trim().min(1).max(40),
  date_soin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_facture: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  montant_total: z.number().int().nonnegative(),
  devise: z.string().min(3).max(3),
  canal_reception: z.string(),
  prestataire_id: z.string().nullable(),
  assure_id: z.string().nullable(),
  contrat_id: z.string().nullable(),
  ordonnance_id: z.string().nullable(),
  lignes: z.array(ligneSchema).min(1),
});

export type FactureSaisie = z.infer<typeof factureSchema>;
