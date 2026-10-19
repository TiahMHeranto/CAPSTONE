"use client";

import { useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { sauverReglages } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

export function ReglagesForm({
  seuil,
  canaux,
  version,
  derive,
  webhook,
}: {
  seuil: number;
  canaux: string;
  version: string;
  derive: number;
  webhook: string;
}) {
  const [confirme, setConfirme] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (!confirme) {
          setConfirme(true);
          setMessage(t("admin.impact"));
          return;
        }
        const recu = await sauverReglages({
          alert_threshold: Number(data.get("seuil")),
          notification_channels: String(data.get("canaux") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          active_model_version: String(data.get("version") ?? ""),
          drift_psi_threshold: Number(data.get("derive")),
          n8n_webhook_url: String(data.get("webhook") ?? ""),
        });
        setMessage(recu.status === 200 ? t("alerte.enregistree") : messageErreur(recu.data));
        setConfirme(false);
      }}
    >
      <label>
        <Etiquette>{t("admin.seuil")}</Etiquette>
        <Champ name="seuil" type="number" step="0.01" min={0} max={1} defaultValue={seuil} />
      </label>
      <label>
        <Etiquette>{t("admin.canaux")}</Etiquette>
        <Champ name="canaux" defaultValue={canaux} />
      </label>
      <label>
        <Etiquette>{t("admin.version")}</Etiquette>
        <Champ name="version" defaultValue={version} />
      </label>
      <label>
        <Etiquette>{t("admin.derive")}</Etiquette>
        <Champ name="derive" type="number" step="0.01" defaultValue={derive} />
      </label>
      <label className="md:col-span-2">
        <Etiquette>{t("admin.webhook")}</Etiquette>
        <Champ name="webhook" defaultValue={webhook} />
      </label>
      {message ? <p role="status">{message}</p> : null}
      <Button type="submit">{confirme ? t("admin.confirmerSeuil") : t("enregistrer")}</Button>
    </form>
  );
}
