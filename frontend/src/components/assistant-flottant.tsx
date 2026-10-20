"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Salon } from "@/features/assistant/salon";
import { t } from "@/i18n/traduire";

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
  const [monte, setMonte] = useState(false);
  const [clavier, setClavier] = useState(0);
  const [demande, setDemande] = useState<{ id: number; texte: string } | null>(null);

  useEffect(() => {
    if (ouvert) setMonte(true);
  }, [ouvert]);

  useEffect(() => {
    function recevoir(event: Event) {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      setOuvert(true);
      if (question) setDemande({ id: Date.now(), texte: question });
    }
    window.addEventListener("prediccare-assistant", recevoir);
    return () => window.removeEventListener("prediccare-assistant", recevoir);
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    function fermer(event: KeyboardEvent) {
      if (event.key === "Escape") setOuvert(false);
    }
    window.addEventListener("keydown", fermer);
    return () => window.removeEventListener("keydown", fermer);
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const vue = window.visualViewport;
    if (!vue) return;
    function mesurer() {
      if (!vue) return;
      setClavier(Math.max(0, window.innerHeight - vue.height - vue.offsetTop));
    }
    vue.addEventListener("resize", mesurer);
    vue.addEventListener("scroll", mesurer);
    mesurer();
    return () => {
      vue.removeEventListener("resize", mesurer);
      vue.removeEventListener("scroll", mesurer);
      setClavier(0);
    };
  }, [ouvert]);

  if (chemin === "/assistant") return null;

  return (
    <div
      className={`fixed right-5 z-40 flex items-end ${ouvert ? "flex-col gap-3" : ""}`}
      style={{ bottom: `max(1.25rem, calc(env(safe-area-inset-bottom) + ${clavier}px))` }}
    >
      {monte ? (
        <section
          role="dialog"
          aria-modal={ouvert}
          aria-hidden={!ouvert}
          aria-label={t("assistant.titre")}
          className={`${ouvert ? "flex" : "hidden"} h-[min(36rem,calc(100dvh-6.5rem))] w-[min(24rem,calc(100vw-2rem))] shrink-0 flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-xl`}
        >
          <Suspense fallback={null}>
            <Salon variant="widget" visible={ouvert} questionDemandee={demande} />
          </Suspense>
        </section>
      ) : null}
      <button
        type="button"
        className={
          ouvert
            ? "grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
            : "inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg"
        }
        aria-expanded={ouvert}
        aria-label={ouvert ? t("assistant.fermer") : t("assistant.ouvrir")}
        onClick={() => setOuvert((etat) => !etat)}
      >
        {ouvert ? <IconeFermer /> : <IconeBulle className="h-5 w-5" />}
        {ouvert ? null : t("assistant.ouvrir")}
      </button>
    </div>
  );
}
