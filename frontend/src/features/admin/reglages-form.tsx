"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { deposerCorpus, etatCorpus, majAssistant, sauverReglages } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

const CANAUX = ["webhook", "email", "slack"] as const;
const VERSIONS = ["v1", "v2", "v3"] as const;

const liste =
  "min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground";

function canalInitial(canaux: string): string {
  const choisi = canaux
    .split(",")
    .map((item) => item.trim())
    .find((item) => item === "webhook" || item === "email" || item === "slack");
  return choisi ?? "webhook";
}

const LIBELLES_CANAL = {
  webhook: "admin.canalWebhook",
  email: "admin.canalEmail",
  slack: "admin.canalSlack",
} as const;

export function ReglagesForm({
  seuil,
  canaux,
  version,
  derive,
  webhook,
  corpus,
  statutCorpus,
}: {
  seuil: number;
  canaux: string;
  version: string;
  derive: number;
  webhook: string;
  corpus: string;
  statutCorpus: string;
}) {
  const [confirme, setConfirme] = useState(false);
  const [message, setMessage] = useState("");
  const [maj, setMaj] = useState(statutCorpus);
  const [chemin, setChemin] = useState(corpus);
  const choix = useRef<HTMLInputElement>(null);

  function noterChemin(data: Record<string, unknown>) {
    if (typeof data.chemin === "string" && data.chemin) setChemin(data.chemin);
  }

  useEffect(() => {
    if (maj !== "en_cours") return;
    const timer = window.setInterval(async () => {
      const recu = await etatCorpus();
      if (recu.status === 200) {
        setMaj(String(recu.data.statut ?? ""));
        noterChemin(recu.data);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [maj]);

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
          notification_channels: [String(data.get("canaux") ?? "")].filter(Boolean),
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
        <select className={liste} name="canaux" defaultValue={canalInitial(canaux)}>
          {CANAUX.map((canal) => (
            <option key={canal} value={canal}>
              {t(LIBELLES_CANAL[canal])}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Etiquette>{t("admin.version")}</Etiquette>
        <select className={liste} name="version" defaultValue={version || "v2"}>
          {VERSIONS.map((item) => (
            <option key={item} value={item}>
              {t(`admin.modele${item.toUpperCase()}Label`)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Etiquette>{t("admin.derive")}</Etiquette>
        <Champ name="derive" type="number" step="0.01" defaultValue={derive} />
      </label>
      <label className="md:col-span-2">
        <Etiquette>{t("admin.webhook")}</Etiquette>
        <Champ name="webhook" defaultValue={webhook} />
      </label>
      <div className="md:col-span-2">
        <Etiquette>{t("admin.corpus")}</Etiquette>
        <div className="flex flex-wrap items-center gap-3">
          <Button variante="secondary" type="button" onClick={() => choix.current?.click()}>
            {t("admin.parcourir")}
          </Button>
          <span className="font-mono text-sm">{chemin}</span>
        </div>
        <input
          ref={choix}
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          {...{ webkitdirectory: "", directory: "" }}
          onChange={async (event) => {
            const fichiers = Array.from(event.target.files ?? []);
            const pdfs = fichiers.filter((fichier) => fichier.name.toLowerCase().endsWith(".pdf"));
            event.target.value = "";
            if (pdfs.length === 0) {
              setMessage(t("admin.aucunPdf"));
              return;
            }
            const formData = new FormData();
            for (const fichier of pdfs) {
              const avecDossier = fichier as File & { webkitRelativePath?: string };
              const relatif = avecDossier.webkitRelativePath || fichier.name;
              formData.append("fichiers", fichier, relatif);
            }
            const recu = await deposerCorpus(formData);
            if (recu.status === 202) {
              noterChemin(recu.data);
              setMaj("en_cours");
              setMessage(t("admin.majLancee"));
              return;
            }
            setMessage(recu.status === 409 ? t("admin.majEnCours") : messageErreur(recu.data));
          }}
        />
        <p className="mt-1 text-xs text-muted">{t("admin.corpusAide")}</p>
      </div>
      {message ? <p role="status">{message}</p> : null}
      <Button type="submit">{confirme ? t("admin.confirmerSeuil") : t("enregistrer")}</Button>
      <Button
        variante="secondary"
        type="button"
        onClick={async () => {
          const recu = await majAssistant();
          if (recu.status === 202) {
            noterChemin(recu.data);
            setMaj("en_cours");
            setMessage(t("admin.majLancee"));
            return;
          }
          setMessage(recu.status === 409 ? t("admin.majEnCours") : messageErreur(recu.data));
        }}
      >
        {t("admin.majAssistant")}
      </Button>
      {maj === "termine" ? <p role="status">{t("admin.majTerminee")}</p> : null}
      {maj === "echec" ? <p role="status">{t("admin.majEchec")}</p> : null}
    </form>
  );
}
