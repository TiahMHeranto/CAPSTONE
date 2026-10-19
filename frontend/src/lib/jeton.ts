import { estRole, type Role } from "@/lib/types";

export function lireCharge(token: string): { role: Role; identifiant: string } | null {
  const brut = token.split(".")[0];
  if (!brut) return null;
  try {
    const pad = brut + "=".repeat((4 - (brut.length % 4)) % 4);
    const b64 = pad.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64);
    const charge = JSON.parse(json) as { role?: string; sub?: string; exp?: number };
    if (!charge.role || !estRole(charge.role) || !charge.sub) return null;
    if (typeof charge.exp === "number" && charge.exp * 1000 < Date.now()) return null;
    return { role: charge.role, identifiant: charge.sub };
  } catch {
    return null;
  }
}
