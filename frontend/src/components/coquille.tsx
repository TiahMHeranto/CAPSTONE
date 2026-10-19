import Link from "next/link";
import { AssistantFlottant } from "@/components/assistant-flottant";
import { EntetePersonnel } from "@/components/entete-personnel";
import { Pouls } from "@/components/domain/pouls";
import { ThemeButton } from "@/components/theme-button";
import { t } from "@/i18n/traduire";
import { bureau, LIENS } from "@/lib/rbac";
import { quitter } from "@/features/auth/api";
import type { Session } from "@/lib/session";

export function Coquille({
  session,
  theme,
  nom = "",
  children,
}: {
  session: Session;
  theme: string;
  nom?: string;
  children: React.ReactNode;
}) {
  const liens = LIENS.filter((lien) => lien.href !== "/assistant" && lien.roles.includes(session.role));
  const sombre = bureau(session.role);
  return (
    <div className={sombre ? "bureau min-h-dvh bg-background md:grid md:grid-cols-[240px_1fr]" : "flex min-h-dvh flex-col bg-background"}>
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-2" href="#contenu">
        {t("passer")}
      </a>
      {sombre ? (
        <nav className="bg-navy p-4 text-white" aria-label={t("marque")}>
          <Link className="mb-6 flex items-center gap-2 text-lg" href="/tableau">
            <Pouls className="h-6 w-12" />
            {t("marque")}
          </Link>
          <ul className="space-y-1">
            {liens.map((lien) => (
              <li key={lien.href}>
                <Link className="block rounded-md px-2 py-2 hover:bg-white/10" href={lien.href}>
                  {t(lien.cle)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <EntetePersonnel liens={liens} session={session} nom={nom} />
      )}
      <div className={sombre ? "flex min-h-dvh flex-col" : "flex min-h-0 flex-1 flex-col"}>
        {sombre ? (
          <div className="flex items-center justify-end gap-3 px-4 py-3 text-sm text-muted">
            <span>
              {session.identifiant} · {t(`roles.${session.role}`)}
            </span>
            <ThemeButton sombre={theme === "dark"} />
            <form action={quitter}>
              <button className="min-h-11 px-2" type="submit">
                {t("quitter")}
              </button>
            </form>
          </div>
        ) : null}
        <main id="contenu" className={sombre ? "mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 pb-10" : "mx-auto w-full max-w-6xl flex-1 space-y-4 px-6 pb-16"}>
          {children}
        </main>
        <footer className="px-4 py-4 text-sm text-muted">
          <Link href="/accessibilite">{t("nav.accessibilite")}</Link>
        </footer>
        <AssistantFlottant />
      </div>
    </div>
  );
}
