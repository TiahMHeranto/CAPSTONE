"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte, boutonSecond } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { lireSession } from "@/lib/session";

export default function Page() {
  const [metriques, setMetriques] = useState<Reponse | null>(null);
  const [supervision, setSupervision] = useState<Reponse | null>(null);
  const [derive, setDerive] = useState<Reponse | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const role = lireSession()?.role;
    setAdmin(role === "administrateur");
    appel("/metrics").then(setMetriques);
    if (role === "administrateur") {
      appel("/admin/supervision").then(setSupervision);
      appel("/admin/drift").then(setDerive);
    }
  }, []);

  const latence = (metriques?.data.latence_ms as Record<string, number> | undefined) ?? null;
  const distribution = (metriques?.data.distribution_scores as Record<string, number> | undefined) ?? null;

  return (
    <>
      <div>
        <h1 className="text-4xl">Pilotage</h1>
        <p className="mt-2 text-sm text-ink/70">Volume, latence et répartition des scores. La dérive est réservée à l&apos;administrateur.</p>
      </div>
      <Carte titre="Métriques">
        {metriques?.status === 200 ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-ink/60">Volume</p>
              <p className="display text-3xl">{String(metriques.data.volume)}</p>
            </div>
            <div>
              <p className="text-ink/60">Erreurs journalisées</p>
              <p className="display text-3xl">{String(metriques.data.erreurs)}</p>
            </div>
            <div>
              <p className="text-ink/60">Latence p95</p>
              <p className="display text-3xl">{latence ? `${latence.p95} ms` : "—"}</p>
            </div>
          </dl>
        ) : null}
        {distribution ? (
          <ul className="mt-4 text-sm">
            {Object.entries(distribution).map(([tranche, nb]) => (
              <li key={tranche} className="flex justify-between border-b border-line py-2">
                <span>{tranche}</span>
                <span className="font-semibold">{nb}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {metriques ? <Bandeau status={metriques.status} data={metriques.data} /> : null}
      </Carte>
      {admin ? (
        <>
          <Carte titre="Supervision">
            {supervision ? <Bandeau status={supervision.status} data={supervision.data} /> : <p className="text-sm">Lecture…</p>}
          </Carte>
          <Carte titre="Dérive">
            {derive?.status === 200 ? (
              <p className="text-sm">
                État {String(derive.data.etat)} · PSI {String(derive.data.psi ?? "—")} · seuil {String(derive.data.seuil)} ·
                effectif {String(derive.data.effectif)}
              </p>
            ) : null}
            {derive ? <Bandeau status={derive.status} data={derive.data} /> : null}
          </Carte>
        </>
      ) : (
        <Carte titre="Dérive et supervision">
          <p className="text-sm">Réservées à l&apos;administrateur.</p>
          <button
            className={`${boutonSecond} mt-3`}
            type="button"
            onClick={async () => setDerive(await appel("/admin/drift"))}
          >
            Voir le refus
          </button>
          {derive ? <Bandeau status={derive.status} data={derive.data} /> : null}
        </Carte>
      )}
    </>
  );
}
