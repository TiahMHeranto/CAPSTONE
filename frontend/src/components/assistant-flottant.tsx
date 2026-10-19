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
  const [depart, setDepart] = useState<Onglet>("chat");
  const [demande, setDemande] = useState<{ id: number; texte: string } | null>(null);

  useEffect(() => {
    function recevoir(event: Event) {
      const question = (event as CustomEvent<{ question?: string }>).detail?.question;
      setDepart("chat");
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

  if (chemin === "/assistant") return null;

  return (
    <div className={`fixed bottom-5 right-5 z-40 flex items-end gap-3 ${ouvert ? "flex-col" : ""}`} style={clair}>
      {ouvert ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={t("assistant.titre")}
          className="flex h-[min(34rem,calc(100dvh-6.5rem))] w-[min(22.5rem,calc(100vw-2rem))] shrink-0 flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
        >
          <Conversation compact depart={depart} demande={demande} />
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
