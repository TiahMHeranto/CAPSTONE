"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Etiquette } from "@/components/ui";
import { decider } from "@/features/alerts/api";
import { MOTIFS, motifTexte, type DecisionCode } from "@/features/alerts/motifs";
import { messageErreur, t } from "@/i18n/traduire";
import { montant } from "@/lib/format";

const ACTIONS = [
  { valeur: "valider", cle: "alerte.valider", cleAlerte: "alerte.validerQuandMeme" },
  { valeur: "rejeter", cle: "alerte.rejeter", cleAlerte: "alerte.rejeter" },
  { valeur: "complement", cle: "alerte.escalader", cleAlerte: "alerte.escalader" },
] as const;

export function DecisionForm({
  factureId,
  enAlerte = false,
  devise = "MGA",
}: {
  factureId: string;
  enAlerte?: boolean;
  devise?: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<DecisionCode>("valider");
  const [motif, setMotif] = useState<string>(MOTIFS.valider[0]);
  const [confirme, setConfirme] = useState(false);
  const [message, setMessage] = useState("");
  const [clos, setClos] = useState<DecisionCode | null>(null);
  const [pris, setPris] = useState<number | null>(null);
  const [reste, setReste] = useState<number | null>(null);

  if (clos) {
    return (
      <Confirmation
        decision={clos}
        motif={motif}
        pris={pris}
        reste={reste}
        devise={devise}
      />
    );
  }

  return (
    <form
      className="sticky bottom-0 space-y-3 rounded-lg border border-border bg-surface p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirme) {
          setConfirme(true);
          setMessage(t("alerte.rappel"));
          return;
        }
        const recu = await decider(factureId, decision, motif);
        if (recu.status === 200) {
          setPris(nombre(recu.data.montant_pris_en_charge));
          setReste(nombre(recu.data.reste_a_charge));
          setClos(decision);
          setMessage("");
          router.refresh();
          return;
        }
        setMessage(messageErreur(recu.data));
      }}
    >
      <h2 className="text-xl">{t("alerte.decision")}</h2>
      {enAlerte ? <p className="text-sm text-muted">{t("alerte.choixAlerte")}</p> : null}
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const choisi = decision === action.valeur;
          const danger = action.valeur === "rejeter";
          return (
            <Button
              key={action.valeur}
              type="button"
              variante={choisi ? (danger ? "danger" : "primary") : "secondary"}
              onClick={() => {
                setDecision(action.valeur);
                setMotif(MOTIFS[action.valeur][0]);
                setConfirme(false);
                setMessage("");
              }}
            >
              {t(enAlerte ? action.cleAlerte : action.cle)}
            </Button>
          );
        })}
      </div>
      <label>
        <Etiquette>{t("alerte.motif")}</Etiquette>
        <select
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground"
          value={motif}
          onChange={(event) => {
            setMotif(event.target.value);
            setConfirme(false);
          }}
        >
          {MOTIFS[decision].map((code) => (
            <option key={code} value={code}>
              {t(`motifs.${decision}.${code}`)}
            </option>
          ))}
        </select>
      </label>
      {message ? <p role="status">{message}</p> : null}
      <Button type="submit">{confirme ? t("alerte.confirmer") : t("enregistrer")}</Button>
    </form>
  );
}

export function Confirmation({
  decision,
  motif,
  pris = null,
  reste = null,
  devise = "MGA",
}: {
  decision: string;
  motif?: string;
  pris?: number | null;
  reste?: number | null;
  devise?: string;
}) {
  const texte =
    decision === "rejeter"
      ? t("alerte.confirmeRejeter")
      : decision === "complement"
        ? t("alerte.confirmeComplement")
        : t("alerte.confirmeValider");
  return (
    <section className="rounded-lg border border-border bg-surface p-4" role="status">
      <h2 className="text-xl">{t("alerte.confirmation")}</h2>
      <p className="mt-2">{texte}</p>
      {motif ? <p className="mt-1 text-sm text-muted">{motifTexte(motif, t)}</p> : null}
      {pris !== null ? (
        <p className="mt-2 text-sm">
          {t("remboursements.pris")} : {montant(pris, devise)}
        </p>
      ) : null}
      {reste !== null ? (
        <p className="text-sm">
          {t("remboursements.reste")} : {montant(reste, devise)}
        </p>
      ) : null}
    </section>
  );
}

function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" ? valeur : null;
}
