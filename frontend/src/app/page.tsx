import { redirect } from "next/navigation";
import { accueil, lireSession } from "@/lib/session";

export default async function Page() {
  const session = await lireSession();
  redirect(session ? accueil(session.role) : "/login");
}
