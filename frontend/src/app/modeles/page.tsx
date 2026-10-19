"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { sauverReglages } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

export default function Page() {
  const [cible, setCible] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("admin.modeles")}</h1>
      <p className="text-sm text-muted">{t("admin.impact")}</p>
      <ul className="space-y-3">
        {["v1", "v2"].map((version) => (
          <li key={version} className="flex items-center justify-between rounded-lg border border-border p-4">
            <span className="font-mono">{version}</span>
            <Button
              variante="secondary"
              type="button"
              onClick={async () => {
                if (cible !== version) {
                  setCible(version);
                  setMessage(t("admin.confirmerModele"));
                  return;
                }
                const recu = await sauverReglages({ active_model_version: version });
                setMessage(recu.status === 200 ? t("alerte.enregistree") : messageErreur(recu.data));
                setCible("");
              }}
            >
              {t("admin.basculer")}
            </Button>
          </li>
        ))}
      </ul>
      {message ? <p role="status">{message}</p> : null}
    </>
  );
}
