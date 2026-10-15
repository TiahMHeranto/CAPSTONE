"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LIENS, lienAutorise } from "@/lib/navigation";
import { LIBELLES, effacerSession, lireSession, type Session } from "@/lib/session";

export function Coquille({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const chemin = usePathname();

  useEffect(() => {
    const actuelle = lireSession();
    if (!actuelle) {
      router.replace("/");
      return;
    }
    setSession(actuelle);
  }, [router, chemin]);

  if (!session) {
    return <p className="p-8 text-ink/70">Ouverture de la session…</p>;
  }

  const liens = LIENS.filter((lien) => lien.roles.includes(session.role));
  const autorise = lienAutorise(chemin, session.role);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-deep text-paper md:min-h-screen md:border-b-0 md:border-r">
        <div className="px-5 py-6">
          <p className="display text-2xl">PrediCare</p>
          <p className="mt-1 text-sm text-paper/70">Écran temporaire</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-3">
          {liens.map((lien) => {
            const actif = chemin === lien.href || chemin.startsWith(`${lien.href}/`);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                  actif ? "bg-paper text-deep" : "text-paper/80 hover:bg-white/10"
                }`}
              >
                {lien.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <p className="text-sm">
            <span className="font-semibold">{session.identifiant}</span>
            <span className="text-ink/60"> · {LIBELLES[session.role]}</span>
          </p>
          <button
            className="text-sm font-semibold text-teal"
            type="button"
            onClick={() => {
              effacerSession();
              router.replace("/");
            }}
          >
            Quitter
          </button>
        </header>
        <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
          {autorise ? (
            children
          ) : (
            <section className="rounded-xl border border-alert/30 bg-card p-5">
              <h1 className="text-2xl">Accès refusé</h1>
              <p className="mt-2 text-sm">
                Le rôle {LIBELLES[session.role]} n&apos;ouvre pas cet écran. L&apos;API répondrait 403.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
