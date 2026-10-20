"use server";

import { appel, appelFichier } from "@/lib/api/serveur";
import type { Reponse } from "@/lib/types";

export async function lirePdf(fichier: File): Promise<Reponse> {
  if (fichier.size === 0) return { status: 422, data: { code: "FICHIER_REFUSE" } };
  return appelFichier("/invoices/extract", fichier);
}

export async function lireOrdonnance(fichier: File): Promise<Reponse> {
  if (fichier.size === 0) return { status: 422, data: { code: "FICHIER_REFUSE" } };
  return appelFichier("/ordonnances/extract", fichier);
}

export async function confirmerOrdonnance(corps: Record<string, unknown>): Promise<Reponse> {
  return appel("/me/ordonnances", { method: "POST", body: corps });
}

export async function envoyerFacture(corps: unknown, valider: boolean): Promise<Reponse> {
  return appel(valider ? "/invoices/validate" : "/invoices", { method: "POST", body: corps });
}
