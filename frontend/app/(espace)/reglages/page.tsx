"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

const CANAUX = ["webhook", "slack", "email"] as const;

export default function Page() {
  const [seuil, setSeuil] = useState("");
  const [version, setVersion] = useState("");
  const [derive, setDerive] = useState("");
  const [webhook, setWebhook] = useState("");
  const [canaux, setCanaux] = useState<string[]>([]);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  function appliquer(data: Record<string, unknown>) {
    setSeuil(String(data.alert_threshold ?? ""));
    setVersion(String(data.active_model_version ?? ""));
    setDerive(data.drift_psi_threshold == null ? "" : String(data.drift_psi_threshold));
    setWebhook(String(data.n8n_webhook_url ?? ""));
    setCanaux(Array.isArray(data.notification_channels) ? data.notification_channels.map(String) : []);
  }

  useEffect(() => {
    appel("/admin/settings").then((recu) => {
      setReponse(recu);
      if (recu.status === 200) appliquer(recu.data);
    });
  }, []);

  async function enregistrer(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    const corps: Record<string, unknown> = {
      alert_threshold: Number(seuil),
      active_model_version: version,
      n8n_webhook_url: webhook,
      notification_channels: canaux,
    };
    if (derive !== "") corps.drift_psi_threshold = Number(derive);
    const recu = await appel("/admin/settings", { method: "PATCH", body: corps });
    setReponse(recu);
    if (recu.status === 200) appliquer(recu.data);
    setEnCours(false);
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Réglages</h1>
        <p className="mt-2 text-sm text-ink/70">
          Le seuil d&apos;alerte et la version active se changent ici. Le service n&apos;a pas besoin d&apos;être relancé.
        </p>
      </div>
      <Carte>
        <form onSubmit={enregistrer} className="grid gap-3 md:grid-cols-2">
          <label>
            <Etiquette>Seuil d&apos;alerte</Etiquette>
            <input className={champ} value={seuil} onChange={(event) => setSeuil(event.target.value)} />
          </label>
          <label>
            <Etiquette>Version active</Etiquette>
            <input className={champ} value={version} onChange={(event) => setVersion(event.target.value)} />
          </label>
          <label>
            <Etiquette>Seuil de dérive</Etiquette>
            <input className={champ} value={derive} onChange={(event) => setDerive(event.target.value)} />
          </label>
          <label>
            <Etiquette>Adresse du workflow</Etiquette>
            <input className={champ} value={webhook} onChange={(event) => setWebhook(event.target.value)} />
          </label>
          <fieldset className="md:col-span-2">
            <Etiquette>Canaux</Etiquette>
            <div className="flex flex-wrap gap-4 text-sm">
              {CANAUX.map((canal) => (
                <label key={canal} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={canaux.includes(canal)}
                    onChange={(event) =>
                      setCanaux(event.target.checked ? [...canaux, canal] : canaux.filter((item) => item !== canal))
                    }
                  />
                  {canal}
                </label>
              ))}
            </div>
          </fieldset>
          <button className={bouton} disabled={enCours} type="submit">
            Enregistrer
          </button>
        </form>
        {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </Carte>
    </>
  );
}
