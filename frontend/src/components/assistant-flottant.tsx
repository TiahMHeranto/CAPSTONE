"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Conversation } from "@/features/assistant/conversation";
import { t } from "@/i18n/traduire";

export function AssistantFlottant() {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3">
      {ouvert ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label={t("assistant.titre")}
          className="flex h-[min(32rem,70dvh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-background p-3 shadow-lg"
        >
          <Conversation compact />
        </section>
      ) : null}
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        aria-expanded={ouvert}
        onClick={() => setOuvert((etat) => !etat)}
      >
        {ouvert ? t("assistant.fermer") : t("assistant.ouvrir")}
      </button>
    </div>
  );
}
