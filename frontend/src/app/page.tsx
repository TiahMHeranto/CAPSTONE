import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/i18n/traduire";
import { lireSession } from "@/lib/session";

const NAV = [
  ["#probleme", "vitrine.navProbleme"],
  ["#solution", "vitrine.navSolution"],
  ["#fonctions", "vitrine.navFonctions"],
  ["#resultats", "vitrine.navResultats"],
  ["#confiance", "vitrine.navConfiance"],
] as const;

export default async function Page() {
  const session = await lireSession();
  return (
    <div className="bg-[#0c2344] text-white">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Marque />
          {t("marque")}
        </Link>
        <nav aria-label={t("marque")} className="order-3 flex w-full gap-5 overflow-x-auto text-sm text-white/75 md:order-none md:w-auto">
          {NAV.map(([href, cle]) => (
            <a key={href} className="shrink-0 hover:text-white" href={href}>
              {t(cle)}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link className="rounded-full border border-white/40 px-4 py-2 text-sm" href={session ? "/tableau" : "/login"}>
            {session ? t("vitrine.espace") : t("vitrine.connecter")}
          </Link>
          <a className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0c2344]" href="#probleme">
            {t("vitrine.decouvrir")}
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-8 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7eb6ff]" />
              {t("vitrine.badge")}
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
              {t("vitrine.titre")}
              <br />
              {t("vitrine.titreSuite")}
            </h1>
            <p className="mt-5 max-w-lg text-white/75">{t("vitrine.intro")}</p>
          </div>
          <Illustration />
        </section>

        <section id="probleme" className="mx-auto max-w-6xl px-6 pb-20">
          <p className="text-xs tracking-wide text-white/60">{t("vitrine.problemeKicker")}</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">{t("vitrine.problemeTitre")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Carte titre={t("vitrine.fraudeTitre")} texte={t("vitrine.fraudeTexte")} />
            <Carte titre={t("vitrine.manuelTitre")} texte={t("vitrine.manuelTexte")} />
            <Carte titre={t("vitrine.volumeTitre")} texte={t("vitrine.volumeTexte")} />
          </div>
        </section>

        <section id="solution" className="bg-[#f4f0e6] px-6 py-16 text-[#1a2b42]">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs tracking-wide text-[#526074]">{t("vitrine.solutionKicker")}</p>
            <h2 className="mt-2 max-w-xl text-3xl font-semibold">{t("vitrine.solutionTitre")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <CarteClaire icone="detect" titre={t("vitrine.detectionTitre")} texte={t("vitrine.detectionTexte")} />
              <CarteClaire icone="doc" titre={t("vitrine.explicationTitre")} texte={t("vitrine.explicationTexte")} />
              <CarteClaire icone="bulle" titre={t("vitrine.assistantTitre")} texte={t("vitrine.assistantTexte")} />
            </div>
          </div>
        </section>

        <section id="fonctions" className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-xs tracking-wide text-white/60">{t("vitrine.fonctionsKicker")}</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">{t("vitrine.fonctionsTitre")}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Pastille icone="detect" titre={t("vitrine.f1")} texte={t("vitrine.f1t")} />
            <Pastille icone="tableau" titre={t("vitrine.f2")} texte={t("vitrine.f2t")} />
            <Pastille icone="bulle" titre={t("vitrine.f3")} texte={t("vitrine.f3t")} />
            <Pastille icone="gens" titre={t("vitrine.f4")} texte={t("vitrine.f4t")} />
          </div>
        </section>

        <section id="resultats" className="mx-auto max-w-6xl px-6 pb-16">
          <p className="text-xs tracking-wide text-white/60">{t("vitrine.resultatsKicker")}</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">{t("vitrine.resultatsTitre")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Carte titre={t("vitrine.r1")} texte={t("vitrine.r1t")} />
            <Carte titre={t("vitrine.r2")} texte={t("vitrine.r2t")} />
            <Carte titre={t("vitrine.r3")} texte={t("vitrine.r3t")} />
          </div>
        </section>

        <section id="confiance" className="mx-auto max-w-6xl px-6 pb-20">
          <p className="text-xs tracking-wide text-white/60">{t("vitrine.confianceKicker")}</p>
          <h2 className="mt-2 max-w-xl text-3xl font-semibold">{t("vitrine.confianceTitre")}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Carte titre={t("vitrine.c1")} texte={t("vitrine.c1t")} />
            <Carte titre={t("vitrine.c2")} texte={t("vitrine.c2t")} />
            <Carte titre={t("vitrine.c3")} texte={t("vitrine.c3t")} />
          </div>
        </section>
      </main>

      <footer className="bg-[#f4f0e6] px-6 py-8 text-[#1a2b42]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 font-semibold">
            <MarqueSombre />
            {t("marque")}
          </p>
          <nav aria-label={t("marque")} className="flex flex-wrap gap-4 text-sm text-[#526074]">
            {NAV.map(([href, cle]) => (
              <a key={href} href={href}>
                {t(cle)}
              </a>
            ))}
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-sm text-[#526074]">{t("vitrine.pied")}</p>
      </footer>
    </div>
  );
}

function Carte({ titre, texte }: { titre: string; texte: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#132c52] p-5">
      <h3 className="font-semibold">{titre}</h3>
      <p className="mt-2 text-sm text-white/70">{texte}</p>
    </article>
  );
}

function CarteClaire({ icone, titre, texte }: { icone: IconeNom; titre: string; texte: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <Icone nom={icone} />
      <h3 className="mt-4 font-semibold">{titre}</h3>
      <p className="mt-2 text-sm text-[#526074]">{texte}</p>
    </article>
  );
}

function Pastille({ icone, titre, texte }: { icone: IconeNom; titre: string; texte: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#132c52] p-5">
      <Icone nom={icone} clair />
      <h3 className="mt-4 font-semibold">{titre}</h3>
      <p className="mt-2 text-sm text-white/70">{texte}</p>
    </article>
  );
}

function Illustration() {
  return (
    <div className="relative mx-auto h-80 w-full max-w-md" aria-hidden="true">
      <div className="absolute right-4 top-8 h-56 w-56 rounded-full bg-[#d5e4f7]" />
      <div className="absolute left-2 top-6 w-64 rounded-3xl bg-white p-5 text-[#1a2b42] shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t("vitrine.facture")}</p>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1d5fd1] text-lg text-white">+</span>
        </div>
        <div className="mt-4 space-y-2">
          <span className="block h-2 w-24 rounded bg-[#d5deea]" />
          <span className="block h-2 w-40 rounded bg-[#e7edf5]" />
          <span className="block h-2 w-32 rounded bg-[#e7edf5]" />
        </div>
        <div className="mt-4 flex justify-between text-xs text-[#526074]">
          <span>{t("vitrine.ligneActe")}</span>
          <span>{t("vitrine.ligneMontant")}</span>
        </div>
      </div>
      <svg className="absolute bottom-6 right-6 h-24 w-20" viewBox="0 0 80 96" fill="none">
        <path d="M40 4 72 16v28c0 24-14 40-32 48C22 84 8 68 8 44V16L40 4Z" fill="#7eb6ff" />
        <path d="M28 46l8 8 16-18" stroke="#0c2344" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function Marque() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-semibold text-[#0c2344]">
      +
    </span>
  );
}

function MarqueSombre() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0c2344] text-xs font-semibold text-white">
      +
    </span>
  );
}

type IconeNom = "detect" | "doc" | "bulle" | "tableau" | "gens";

function Icone({ nom, clair = false }: { nom: IconeNom; clair?: boolean }) {
  const trait = clair ? "text-[#7eb6ff]" : "text-[#1d5fd1]";
  return (
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${clair ? "bg-white/10" : "bg-[#e8f0fb]"} ${trait}`}>
      {nom === "detect" ? <Chemin d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" /> : null}
      {nom === "doc" ? <Chemin d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm7 1v5h5M8 13h8M8 17h5" /> : null}
      {nom === "bulle" ? <Chemin d="M5 6h14v9H8l-3 3V6Z" /> : null}
      {nom === "tableau" ? <Chemin d="M4 5h16v14H4V5Zm0 5h16M10 10v9" /> : null}
      {nom === "gens" ? <Chemin d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a2.5 2.5 0 1 0 0-5M4 19c.4-2.4 2.4-4 5-4s4.6 1.6 5 4M14 15c1.8.2 3.3 1.3 3.8 3" /> : null}
    </span>
  );
}

function Chemin({ d }: { d: string }): ReactNode {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
