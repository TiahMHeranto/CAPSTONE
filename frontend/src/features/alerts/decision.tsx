"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Champ, Etiquette } from "@/components/ui";
import { decider } from "@/features/alerts/api";
import { messageErreur, t } from "@/i18n/traduire";

const ACTIONS = [
  { valeur: "valider", cle: "alerte.valider" },
  { valeur: "rejeter", cle: "alerte.ecarter" },
  { valeur: "complement", cle: "alerte.escalader" },
] as const;

export function DecisionForm({ factureId }: { factureId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<(typeof ACTIONS)[number]["valeur"]>("valider");
  const [motif, setMotif] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <form
      className="sticky bottom-0 space-y-3 rounded-lg border border-border bg-surface p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (motif.trim().length < 10) {
          setMessage(t("alerte.motifCourt"));
          return;
        }
        if (!confirme) {
          setConfirme(true);
          setMessage(t("alerte.rappel"));
          return;
        }
        const recu = await decider(factureId, decision, motif.trim());
        if (recu.status === 200) {
          setMessage(t("alerte.enregistree"));
          router.refresh();
          return;
        }
        setMessage(messageErreur(recu.data));
      }}
    >
      <h2 className="text-xl">{t("alerte.decision")}</h2>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Button
            key={action.valeur}
            type="button"
            variante={decision === action.valeur ? "primary" : "secondary"}
            onClick={() => {
              setDecision(action.valeur);
              setConfirme(false);
            }}
          >
            {t(action.cle)}
          </Button>
        ))}
      </div>
      <label>
        <Etiquette>{t("alerte.motif")}</Etiquette>
        <Champ value={motif} minLength={10} onChange={(event) => setMotif(event.target.value)} required />
      </label>
      {message ? <p role="status">{message}</p> : null}
      <Button type="submit">{confirme ? t("alerte.confirmer") : t("enregistrer")}</Button>
    </form>
  );
}
