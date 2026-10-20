"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_ACTIVITE, COOKIE_SESSION } from "@/lib/cookies";
import { appel } from "@/lib/api/serveur";
import { accueil } from "@/lib/session";
import { estRole } from "@/lib/types";

export async function connecter(formData: FormData): Promise<{ erreur: string } | void> {
  const identifiant = String(formData.get("identifiant") ?? "").trim();
  const motDePasse = String(formData.get("mot_de_passe") ?? "");
  const response = await fetch(`${process.env.API_URL ?? "http://localhost:8000"}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifiant, mot_de_passe: motDePasse }),
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as { token?: string; role?: string; code?: string };
  if (!response.ok || !data.token || !data.role || !estRole(data.role)) {
    return { erreur: data.code === "TROP_DE_REQUETES" ? "attente" : "echec" };
  }
  const jar = await cookies();
  const rester = formData.get("rester") === "on";
  jar.set(COOKIE_SESSION, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(rester ? { maxAge: 8 * 3600 } : {}),
  });
  jar.set(COOKIE_ACTIVITE, String(Date.now()), { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(accueil(data.role));
}

export async function changerMotDePasse(corps: { actuel: string; nouveau: string; confirmation: string }) {
  return appel("/me/mot-de-passe", { method: "POST", body: corps });
}

export async function quitter() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSION);
  jar.delete(COOKIE_ACTIVITE);
  redirect("/login");
}
