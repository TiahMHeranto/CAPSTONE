"use client";

import { usePathname } from "next/navigation";
import { ThemeButton } from "@/components/theme-button";
import { quitter } from "@/features/auth/api";
import { t } from "@/i18n/traduire";
import type { Lien } from "@/lib/rbac";

export function EnteteBureau({ liens, sombre, espace }: { liens: Lien[]; sombre: boolean; espace: string }) {
  const chemin = usePathname();
  const courant = [...liens].reverse().find((lien) => chemin === lien.href || chemin.startsWith(`${lien.href}/`));
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <p className="text-sm text-muted">
        {t(espace)}
        {courant ? <span className="text-foreground"> · {t(courant.cle)}</span> : null}
      </p>
      <div className="flex items-center gap-2">
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">{t("coquille.demo")}</span>
        <ThemeButton sombre={sombre} />
        <form action={quitter}>
          <button className="min-h-11 rounded-full px-3 text-sm" type="submit">
            {t("quitter")}
          </button>
        </form>
      </div>
    </header>
  );
}
