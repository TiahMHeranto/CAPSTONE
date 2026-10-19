"use server";

import { appel } from "@/lib/api/serveur";

export async function decider(factureId: string, decision: string, motif: string) {
  return appel(`/invoices/${factureId}/decisions`, { method: "POST", body: { decision, motif } });
}
