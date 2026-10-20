"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { t } from "@/i18n/traduire";

export function Depot({
  consigne,
  action,
  occupe = false,
  onScanner,
}: {
  consigne: string;
  action: string;
  occupe?: boolean;
  onScanner: (fichier: File) => void;
}) {
  const choix = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [fichier, setFichier] = useState<File | null>(null);

  function ouvrir() {
    choix.current?.click();
  }

  function retenir(recu: File | undefined) {
    if (!recu) return;
    setFichier(recu);
  }

  return (
    <div
      onClick={ouvrir}
      onDragOver={(event) => {
        event.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(event) => {
        event.preventDefault();
        setSurvol(false);
        retenir(event.dataTransfer.files[0]);
      }}
      className={`cursor-pointer rounded-2xl border border-border bg-surface p-3 text-center shadow-sm ${
        survol ? "border-primary" : ""
      }`}
    >
      <input
        ref={choix}
        className="sr-only"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          retenir(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div
        className={`rounded-xl border border-dashed px-6 py-8 ${
          survol ? "border-primary bg-primary-soft" : "border-border bg-surface-muted"
        }`}
      >
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Dossier />
        </span>
        <p className="mx-auto max-w-sm text-sm text-muted">{consigne}</p>
        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
          <span className="h-px flex-1 bg-border" />
          {t("factures.ou")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            ouvrir();
          }}
        >
          {t("factures.parcourir")}
        </Button>
        {fichier ? (
          <div className="mt-4">
            <p className="text-sm">{fichier.name}</p>
            <Button
              type="button"
              className="mt-3"
              disabled={occupe}
              onClick={(event) => {
                event.stopPropagation();
                onScanner(fichier);
              }}
            >
              {action}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Dossier() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        fill="currentColor"
      />
      <path d="M3 10h18v6.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5V10Z" fill="currentColor" opacity="0.72" />
    </svg>
  );
}
