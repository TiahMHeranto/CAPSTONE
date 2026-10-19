"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pouls } from "@/components/domain/pouls";
import { quitter } from "@/features/auth/api";
import { t } from "@/i18n/traduire";
import { initiales } from "@/lib/nom";
import type { Lien } from "@/lib/rbac";
import type { Session } from "@/lib/session";

export function EntetePersonnel({ liens, session, nom }: { liens: Lien[]; session: Session; nom: string }) {
  const chemin = usePathname();
  const visible = nom || session.identifiant;
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
      <Link className="flex items-center gap-2 font-semibold" href="/tableau">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white">
          <Pouls className="h-4 w-8" />
        </span>
        {t("marque")}
      </Link>
      <nav className="flex flex-wrap items-center gap-1" aria-label={t("marque")}>
        {liens.map((lien) => {
          const actif = lien.href === "/tableau" ? chemin === "/tableau" : chemin === lien.href || chemin.startsWith(`${lien.href}/`);
          const cle = lien.href === "/tableau" ? "nav.vue" : lien.cle;
          return (
            <Link
              key={lien.href}
              className={actif ? "rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary" : "rounded-full px-3 py-1.5 text-sm text-foreground"}
              href={lien.href}
              aria-current={actif ? "page" : undefined}
            >
              {t(cle)}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-xs font-semibold text-white" aria-hidden="true">
          {initiales(visible)}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-medium">{visible}</span>
          <span className="block text-xs text-muted">{t(`roles.${session.role}`)}</span>
        </span>
        <form action={quitter}>
          <button className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-white px-3 text-sm" type="submit">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
              <path d="M4 12h11M12 8l4 4-4 4" />
            </svg>
            {t("quitter")}
          </button>
        </form>
      </div>
    </header>
  );
}
