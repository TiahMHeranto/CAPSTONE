"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Contrat = {
  contrat_id?: string;
  formule?: string;
  statut?: string;
  date_effet?: string | null;
  date_fin?: string | null;
};

export default function Page() {
  const [reponse, setReponse] = useState<Reponse | null>(null);

  useEffect(() => {
    appel("/me/contrat").then(setReponse);
  }, []);

  const contrat = (reponse?.data.contrat ?? null) as Contrat | null;

  return (
    <>
      <div>
        <h1 className="text-4xl">Contrat</h1>
        <p className="mt-2 text-sm text-ink/70">
          Le contrat est celui de l&apos;assuré rattaché au compte. Un professionnel n&apos;a pas de police : sa fiche
          d&apos;établissement est sur le profil.
        </p>
      </div>
      <Carte>
        {reponse?.status === 200 && !contrat ? (
          <p className="text-sm">Aucun contrat pour ce compte.</p>
        ) : null}
        {contrat ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/60">Identifiant</dt>
              <dd className="font-semibold">{contrat.contrat_id}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Formule</dt>
              <dd>{contrat.formule ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Statut</dt>
              <dd>{contrat.statut ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Effet</dt>
              <dd>
                {contrat.date_effet ?? "—"} → {contrat.date_fin ?? "en cours"}
              </dd>
            </div>
          </dl>
        ) : null}
        {reponse && reponse.status !== 200 ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
        {reponse?.status === 200 ? null : reponse ? null : <p className="text-sm">Lecture…</p>}
      </Carte>
    </>
  );
}
