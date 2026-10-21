import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Salon } from "@/features/assistant/salon";
import { lireSession } from "@/lib/session";

export default async function Page() {
  const session = await lireSession();
  if (!session) redirect("/login");
  return (
    <Suspense fallback={null}>
      <Salon identifiant={session.identifiant} />
    </Suspense>
  );
}
