"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pouls } from "@/components/domain/pouls";
import { t } from "@/i18n/traduire";
import type { Lien } from "@/lib/rbac";
import { initiales } from "@/lib/nom";
import type { Session } from "@/lib/session";

export function BureauNav({
  liens,
  session,
  nom,
  alertes,
  espace,
}: {
  liens: Lien[];
  session: Session;
  nom: string;
  alertes: number;
  espace: string;
}) {
  const chemin = usePathname();
  const libelle = nom || session.identifiant;
  return (
    <aside className="flex flex-col bg-[#121a2b] px-4 py-5 text-white md:sticky md:top-0 md:h-dvh md:w-[260px] md:overflow-y-auto">
      <Link className="mb-6 flex items-center gap-3 px-1" href="/tableau">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
          <Pouls className="h-4 w-7" />
        </span>
        <span>
          <span className="block text-base font-semibold">{t("marque")}</span>
          <span className="block text-xs text-white/60">{t("coquille.tagline")}</span>
        </span>
      </Link>
      <div className="mb-5 rounded-2xl bg-white/10 px-3 py-3">
        <p className="text-sm font-medium">{t(espace)}</p>
        <p className="text-xs text-white/60">{t(`roles.${session.role}`)}</p>
      </div>
      <nav aria-label={t("marque")}>
        <ul className="space-y-1">
          {liens.map((lien) => {
            const actif = chemin === lien.href || chemin.startsWith(`${lien.href}/`);
            return (
              <li key={lien.href}>
                <Link
                  className={
                    actif
                      ? "flex items-center justify-between rounded-xl bg-white/15 px-3 py-2.5 text-sm"
                      : "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-white/75 hover:bg-white/10"
                  }
                  href={lien.href}
                  aria-current={actif ? "page" : undefined}
                >
                  <span>{t(lien.cle)}</span>
                  {lien.href === "/alertes" && alertes > 0 ? (
                    <span className="rounded-full bg-[#e7edf6] px-2 text-xs font-semibold text-[#1c2430]">{alertes}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto pt-6">
        <p className="px-1 text-sm leading-snug text-white/70">{t("coquille.citation")}</p>
        <p className="mt-4 px-1 text-xs text-white/45">
          <Link href="/accessibilite">{t("coquille.centre")}</Link>
        </p>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-semibold">
            {initiales(libelle)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{libelle}</span>
            <span className="block truncate text-xs text-white/55">{t(`roles.${session.role}`)}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
