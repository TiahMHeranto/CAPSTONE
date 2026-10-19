import { lireSession, type Session } from "@/lib/session";
import type { Reponse } from "@/lib/types";

function origine(): string {
  return process.env.API_URL ?? "http://localhost:8000";
}

async function sessionOuVide(): Promise<Session | null> {
  return lireSession();
}

export async function appel(
  chemin: string,
  init: { method?: string; body?: unknown; admin?: boolean } = {},
): Promise<Reponse> {
  const session = await sessionOuVide();
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (session) headers.Authorization = `Bearer ${session.token}`;
  if (init.admin && process.env.ADMIN_API_KEY) headers["X-Admin-Key"] = process.env.ADMIN_API_KEY;
  const response = await fetch(`${origine()}${chemin}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  return lire(response);
}

export async function appelFichier(chemin: string, fichier: File): Promise<Reponse> {
  const session = await sessionOuVide();
  const headers: Record<string, string> = {};
  if (session) headers.Authorization = `Bearer ${session.token}`;
  const corps = new FormData();
  corps.append("fichier", fichier);
  return envoyer(chemin, corps, headers);
}

export async function appelFormulaire(chemin: string, corps: FormData): Promise<Reponse> {
  const session = await sessionOuVide();
  const headers: Record<string, string> = {};
  if (session) headers.Authorization = `Bearer ${session.token}`;
  return envoyer(chemin, corps, headers);
}

async function envoyer(chemin: string, corps: FormData, headers: Record<string, string>): Promise<Reponse> {
  const response = await fetch(`${origine()}${chemin}`, {
    method: "POST",
    headers,
    body: corps,
    cache: "no-store",
  });
  return lire(response);
}

async function lire(response: Response): Promise<Reponse> {
  try {
    const recu = await response.json();
    const data = recu && typeof recu === "object" ? (recu as Record<string, unknown>) : { valeur: recu };
    return { status: response.status, data };
  } catch {
    return { status: response.status, data: { code: "ILLISIBLE" } };
  }
}
