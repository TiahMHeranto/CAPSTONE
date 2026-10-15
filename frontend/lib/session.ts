export const ROLES = ["prestataire", "assure", "gestionnaire", "administrateur"] as const;

export type Role = (typeof ROLES)[number];

export type Session = {
  identifiant: string;
  role: Role;
  token: string;
};

const CLE = "prediccare-session";

export const LIBELLES: Record<Role, string> = {
  prestataire: "Professionnel de santé",
  assure: "Assuré",
  gestionnaire: "Gestionnaire",
  administrateur: "Administrateur",
};

export function lireSession(): Session | null {
  if (typeof window === "undefined") return null;
  const brut = window.sessionStorage.getItem(CLE);
  if (!brut) return null;
  try {
    const session = JSON.parse(brut) as Session;
    if (!ROLES.includes(session.role) || !session.token) return null;
    return session;
  } catch {
    return null;
  }
}

export function ecrireSession(session: Session) {
  window.sessionStorage.setItem(CLE, JSON.stringify(session));
}

export function effacerSession() {
  window.sessionStorage.removeItem(CLE);
}
