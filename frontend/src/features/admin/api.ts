"use server";

import { appel } from "@/lib/api/serveur";

export async function sauverReglages(corps: Record<string, unknown>) {
  return appel("/admin/settings", { method: "PATCH", body: corps });
}

export async function creerCompte(corps: Record<string, unknown>) {
  return appel("/admin/utilisateurs", { method: "POST", body: corps });
}

export async function reveler(pseudoId: string) {
  return appel("/admin/reidentify", { method: "POST", body: { pseudo_id: pseudoId }, admin: true });
}
