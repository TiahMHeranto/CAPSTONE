"use server";

import { appel, appelFormulaire } from "@/lib/api/serveur";

export async function sauverReglages(corps: Record<string, unknown>) {
  return appel("/admin/settings", { method: "PATCH", body: corps });
}

export async function etatCorpus() {
  return appel("/admin/assistant/corpus");
}

export async function deposerCorpus(formData: FormData) {
  return appelFormulaire("/admin/assistant/corpus", formData);
}

export async function majAssistant() {
  return appel("/admin/assistant/reindex", { method: "POST" });
}

export async function creerCompte(corps: Record<string, unknown>) {
  return appel("/admin/utilisateurs", { method: "POST", body: corps });
}

export async function supprimerCompte(identifiant: string) {
  return appel(`/admin/utilisateurs/${encodeURIComponent(identifiant)}`, { method: "DELETE" });
}

export async function annuaire(cible: string) {
  return appel(`/admin/annuaire?cible=${encodeURIComponent(cible)}`);
}

export async function reveler(pseudoId: string) {
  return appel("/admin/reidentify", { method: "POST", body: { pseudo_id: pseudoId }, admin: true });
}
