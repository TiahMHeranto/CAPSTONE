"use server";

import { appel, appelFichier } from "@/lib/api/serveur";
import type { Reponse } from "@/lib/types";

export async function lirePdf(formData: FormData): Promise<Reponse> {
  const fichier = formData.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return { status: 422, data: { code: "FICHIER_REFUSE" } };
  }
  return appelFichier("/invoices/extract", fichier);
}

export async function envoyerFacture(corps: unknown, valider: boolean): Promise<Reponse> {
  return appel(valider ? "/invoices/validate" : "/invoices", { method: "POST", body: corps });
}
