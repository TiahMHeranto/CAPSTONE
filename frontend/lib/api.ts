import { lireSession } from "./session";

export type Reponse = {
  status: number;
  data: Record<string, unknown>;
};

export async function appel(
  chemin: string,
  init: { method?: string; body?: unknown; clefAdmin?: string } = {},
): Promise<Reponse> {
  const session = lireSession();
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  if (init.clefAdmin) headers["X-Admin-Key"] = init.clefAdmin;
  const response = await fetch(`/backend${chemin}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  let data: Record<string, unknown> = {};
  try {
    const recu = await response.json();
    data = recu && typeof recu === "object" ? (recu as Record<string, unknown>) : { valeur: recu };
  } catch {
    data = { motif: "réponse illisible" };
  }
  return { status: response.status, data };
}

export async function appelFichier(chemin: string, fichier: File): Promise<Reponse> {
  const session = lireSession();
  const headers: Record<string, string> = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const corps = new FormData();
  corps.append("fichier", fichier);
  const response = await fetch(`/backend${chemin}`, { method: "POST", headers, body: corps });
  let data: Record<string, unknown> = {};
  try {
    const recu = await response.json();
    data = recu && typeof recu === "object" ? (recu as Record<string, unknown>) : { valeur: recu };
  } catch {
    data = { motif: "réponse illisible" };
  }
  return { status: response.status, data };
}
