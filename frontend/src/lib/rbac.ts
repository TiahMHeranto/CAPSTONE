import type { Role } from "@/lib/types";

export type Lien = { href: string; cle: string; roles: Role[] };

const TOUS: Role[] = ["prestataire", "assure", "gestionnaire", "administrateur"];
const GESTION: Role[] = ["gestionnaire", "administrateur"];
const PRO: Role[] = ["prestataire", "gestionnaire", "administrateur"];

export const LIENS: Lien[] = [
  { href: "/tableau", cle: "nav.tableau", roles: TOUS },
  { href: "/factures", cle: "nav.factures", roles: PRO.concat("assure") },
  { href: "/alertes", cle: "nav.alertes", roles: GESTION },
  { href: "/ordonnances", cle: "nav.ordonnances", roles: ["prestataire", "assure", "gestionnaire", "administrateur"] },
  { href: "/remboursements", cle: "nav.remboursements", roles: ["assure"] },
  { href: "/garanties", cle: "nav.garanties", roles: ["assure", "prestataire"] },
  { href: "/assistant", cle: "nav.assistant", roles: TOUS },
  { href: "/pilotage", cle: "nav.pilotage", roles: GESTION },
  { href: "/decisions", cle: "nav.decisions", roles: GESTION },
  { href: "/lecture", cle: "nav.lecture", roles: GESTION },
  { href: "/supervision", cle: "nav.supervision", roles: ["administrateur"] },
  { href: "/reglages", cle: "nav.reglages", roles: ["administrateur"] },
  { href: "/modeles", cle: "nav.modeles", roles: ["administrateur"] },
  { href: "/utilisateurs", cle: "nav.utilisateurs", roles: ["administrateur"] },
  { href: "/identites", cle: "nav.identites", roles: ["administrateur"] },
  { href: "/audit", cle: "nav.audit", roles: GESTION },
  { href: "/profil", cle: "nav.profil", roles: TOUS },
];

const REGLES: { prefixe: string; roles: Role[] }[] = [
  { prefixe: "/login", roles: TOUS },
  { prefixe: "/accessibilite", roles: TOUS },
  ...LIENS.map((lien) => ({ prefixe: lien.href, roles: lien.roles })),
];

export function autorise(chemin: string, role: Role): boolean {
  const regle = REGLES.find((item) => chemin === item.prefixe || chemin.startsWith(`${item.prefixe}/`));
  if (!regle) return false;
  return regle.roles.includes(role);
}

export function bureau(role: Role): boolean {
  return role === "gestionnaire" || role === "administrateur";
}
