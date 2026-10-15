import type { Role } from "./session";

export type Lien = {
  href: string;
  label: string;
  roles: Role[];
};

const TOUS: Role[] = ["prestataire", "assure", "gestionnaire", "administrateur"];

export const LIENS: Lien[] = [
  { href: "/tableau", label: "Accueil", roles: TOUS },
  { href: "/factures", label: "Factures", roles: TOUS },
  { href: "/alertes", label: "Alertes", roles: ["gestionnaire", "administrateur"] },
  { href: "/bi", label: "Synthèse", roles: ["gestionnaire", "administrateur"] },
  { href: "/pilotage", label: "Pilotage", roles: ["gestionnaire", "administrateur"] },
  { href: "/remboursements", label: "Remboursements", roles: ["assure"] },
  { href: "/reglages", label: "Réglages", roles: ["administrateur"] },
  { href: "/identites", label: "Identités", roles: ["administrateur"] },
];

export function lienAutorise(href: string, role: Role) {
  const lien = LIENS.find((item) => href === item.href || href.startsWith(`${item.href}/`));
  if (!lien) return true;
  return lien.roles.includes(role);
}
