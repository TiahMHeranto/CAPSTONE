import Link from "next/link";
import { FormulaireLogin } from "@/app/(auth)/login/formulaire";
import { Pouls } from "@/components/domain/pouls";
import { t } from "@/i18n/traduire";

const PUCES = ["login.puceDonnees", "login.puceDecision", "login.puceJournal"];

export default function Page() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-navy px-8 py-10 text-white sm:px-12">
        <p className="flex items-center gap-2 text-lg">
          <Pouls className="h-6 w-12" />
          {t("login.bandeau")}
        </p>
        <div className="max-w-xl py-12">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            {t("login.accroche")}
            <br />
            {t("login.accrocheSuite")}
          </h1>
          <p className="mt-6 max-w-lg text-white/85">{t("login.mission")}</p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {PUCES.map((cle) => (
              <li key={cle} className="rounded-full border border-white/30 px-3 py-2 text-sm">
                {t(cle)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">{t("login.roles")}</p>
      </section>
      <section className="flex min-h-dvh flex-col bg-surface px-6 py-8 sm:px-12">
        <p className="self-end text-sm text-muted">{t("login.langue")}</p>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <h2 className="text-3xl font-semibold">{t("login.titre")}</h2>
          <p className="mt-2 text-muted">{t("login.acces")}</p>
          <div className="mt-8">
            <FormulaireLogin />
          </div>
        </div>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <Link href="/accessibilite">{t("nav.accessibilite")}</Link>
          <span>{t("login.confidentialite")}</span>
          <span>{t("login.aide")}</span>
          <span className="ml-auto font-mono">{t("login.version")}</span>
        </footer>
      </section>
    </main>
  );
}
