"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Volumes = Record<string, number>;
type AlerteStatut = { canal: string; statut: string; nb: number; derniere: string | null };
type Decision = { facture_id: string; decision: string; acteur: string; created_at: string; score: number; classe: string };
type Tranche = { model_version: string; tranche: string; nb: number };

const LIBELLES: Record<string, string> = {
  nb_factures: "Factures",
  nb_predictions: "Scores",
  nb_alertes_modele: "Alertes modèle",
  nb_normales: "Normales",
  nb_notifications: "Notifications",
  nb_decisions: "Décisions",
  nb_rejets: "Rejets",
  montant_economise: "Montant des rejets confirmés",
  taux_detection: "Taux de détection",
};

export default function Page() {
  const [reponse, setReponse] = useState<Reponse | null>(null);

  useEffect(() => {
    appel("/bi").then(setReponse);
  }, []);

  const volumes = (reponse?.data.volumes as Volumes | undefined) ?? null;
  const alertes = (reponse?.data.alertes_par_statut as AlerteStatut[] | undefined) ?? [];
  const decisions = (reponse?.data.decisions as Decision[] | undefined) ?? [];
  const scores = (reponse?.data.distribution_scores as Tranche[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">Synthèse</h1>
        <p className="mt-2 text-sm text-ink/70">Vues en lecture seule. Pas de motif libre, pas d&apos;identité.</p>
      </div>
      {volumes ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(volumes).map(([cle, valeur]) => (
            <article key={cle} className="rounded-xl border border-line bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-ink/60">{LIBELLES[cle] ?? cle}</p>
              <p className="display mt-2 text-3xl">{valeur}</p>
            </article>
          ))}
        </div>
      ) : null}
      <Carte titre="Notifications par canal">
        {alertes.length ? (
          <ul className="text-sm">
            {alertes.map((ligne) => (
              <li key={`${ligne.canal}-${ligne.statut}`} className="flex justify-between border-b border-line py-2">
                <span>
                  {ligne.canal} · {ligne.statut}
                </span>
                <span className="font-semibold">{ligne.nb}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Aucune notification agrégée.</p>
        )}
      </Carte>
      <Carte titre="Décisions récentes">
        <ul className="space-y-2 text-sm">
          {decisions.slice(0, 12).map((ligne) => (
            <li key={`${ligne.facture_id}-${ligne.created_at}`} className="flex flex-wrap justify-between gap-2">
              <a className="text-teal" href={`/factures/${ligne.facture_id}`}>
                {ligne.facture_id}
              </a>
              <span>
                {ligne.decision} · {ligne.classe} · {ligne.score}
              </span>
            </li>
          ))}
        </ul>
      </Carte>
      <Carte titre="Distribution des scores">
        <ul className="text-sm">
          {scores.map((ligne) => (
            <li key={`${ligne.model_version}-${ligne.tranche}`} className="flex justify-between border-b border-line py-2">
              <span>
                {ligne.model_version} · {ligne.tranche}
              </span>
              <span className="font-semibold">{ligne.nb}</span>
            </li>
          ))}
        </ul>
      </Carte>
      {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : <p className="text-sm">Lecture…</p>}
    </>
  );
}
