export const ROLES = ["prestataire", "assure", "gestionnaire", "administrateur"] as const;

export type Role = (typeof ROLES)[number];

export type Reponse = {
  status: number;
  data: Record<string, unknown>;
};

export function estRole(valeur: string): valeur is Role {
  return (ROLES as readonly string[]).includes(valeur);
}
