"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Conversation } from "@/features/assistant/conversation";
import { t } from "@/i18n/traduire";

type Onglet = "chat" | "base";

const clair: CSSProperties = {
  ["--foreground" as string]: "#0e1a2b",
  ["--muted-foreground" as string]: "#526074",
  ["--border" as string]: "#e6ebf2",
  ["--surface" as string]: "#ffffff",
  ["--primary" as string]: "#1fbf75",
  ["--primary-hover" as string]: "#17a866",
  ["--primary-soft" as string]: "#e8f8f0",
  ["--primary-foreground" as string]: "#ffffff",
  color: "#0e1a2b",
};

function IconeBulle({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} fill-current`}>
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconeFermer() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function AssistantFlottant() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [invitation, setInvitation] = useState(true);
  const [depart, setDepart] = useState<Onglet>("chat");

  useEffect(() => {
    if (!ouvert) return;
    function fermer(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [ouvert]);

  if (chemin === "/assistant") return null;

  function ouvrir(cible: Onglet) {
    setDepart(cible);
    setOuvert(true);
  }

  return (
    <div className={`fixed bottom-5 right-5 z-40 flex items-end gap-3 ${ouvert ? "flex-col" : ""}`} style={clair}>
      {ouvert ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={t("assistant.titre")}
          className="flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(22.5rem,calc(100vw-2rem))] shrink-0 flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        >
          <Conversation compact depart={depart} />
        </section>
      ) : invitation ? (
        <aside className="mb-2 w-[min(20rem,calc(100vw-6rem))] rounded-2xl bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold leading-snug">{t("assistant.teaser")}</p>
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-primary-soft"
              aria-label={t("assistant.fermerInvitation")}
              onClick={() => setInvitation(false)}
            >
              <IconeFermer />
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {t("assistant.enLigne")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground"
              onClick={() => ouvrir("chat")}
            >
              <IconeBulle className="h-4 w-4" />
              {t("assistant.discuter")}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center rounded-full border border-border px-3 text-sm"
              onClick={() => ouvrir("base")}
            >
              {t("assistant.base")}
            </button>
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-expanded={ouvert}
        aria-label={ouvert ? t("assistant.fermer") : t("assistant.ouvrir")}
        onClick={() => setOuvert((etat) => !etat)}
      >
        {ouvert ? <IconeFermer /> : <IconeBulle />}
      </button>
    </div>
  );
}
