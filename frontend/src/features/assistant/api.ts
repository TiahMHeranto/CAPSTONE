"use server";

import { appel } from "@/lib/api/serveur";

export async function demander(question: string) {
  return appel("/assistant", { method: "POST", body: { question } });
}
