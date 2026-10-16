import type { Role } from "./session";

export type Lien = {
  href: string;
  label: string;
  roles: Role[];
};

const TOUS: Role[] = ["prestataire", "assure", "gestionnaire", "administrateur"];

const DOSSIER: Role[] = ["prestataire", "assure"];

export const LIENS: Lien[] = [
  { href: "/tableau", label: "Accueil", roles: TOUS },
  { href: "/profil", label: "Profil", roles: TOUS },
  { href: "/contrat", label: "Contrat", roles: DOSSIER },
  { href: "/ordonnances", label: "Ordonnances", roles: DOSSIER },
  { href: "/assistant", label: "Assistant", roles: TOUS },
  { href: "/factures", label: "Factures", roles: TOUS },
  { href: "/alertes", label: "Alertes", roles: ["gestionnaire", "administrateur"] },
  { href: "/bi", label: "Synthèse", roles: ["gestionnaire", "administrateur"] },
  { href: "/pilotage", label: "Pilotage", roles: ["gestionnaire", "administrateur"] },
  { href: "/remboursements", label: "Remboursements", roles: ["assure"] },
  { href: "/lecture", label: "Lecture", roles: ["gestionnaire", "administrateur"] },
  { href: "/utilisateurs", label: "Utilisateurs", roles: ["administrateur"] },
  { href: "/reglages", label: "Réglages", roles: ["administrateur"] },
  { href: "/identites", label: "Identités", roles: ["administrateur"] },
];

export function lienAutorise(href: string, role: Role) {
  const lien = LIENS.find((item) => href === item.href || href.startsWith(`${item.href}/`));
  if (!lien) return true;
  return lien.roles.includes(role);
}
