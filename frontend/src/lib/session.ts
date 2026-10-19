import { cookies } from "next/headers";
import { COOKIE_SESSION } from "@/lib/cookies";
import { lireCharge } from "@/lib/jeton";
import type { Role } from "@/lib/types";

export { COOKIE_ACTIVITE, COOKIE_SESSION, COOKIE_THEME } from "@/lib/cookies";

export type Session = {
  token: string;
  role: Role;
  identifiant: string;
};

export async function lireSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_SESSION)?.value;
  if (!token) return null;
  const charge = lireCharge(token);
  if (!charge) return null;
  return { token, ...charge };
}

export function accueil(_role: Role): string {
  return "/tableau";
}
