"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Nom = { nom?: string | null; prenoms?: string | null };
type Contrat = { contrat_id?: string; formule?: string; statut?: string; date_effet?: string; date_fin?: string };

export default function Page() {
  const [reponse, setReponse] = useState<Reponse | null>(null);

  useEffect(() => {
    appel("/me/profil").then(setReponse);
  }, []);

  const data = reponse?.status === 200 ? reponse.data : null;
  const nom = data?.nom as Nom | string | undefined;
  const contrat = data?.contrat as Contrat | null | undefined;
  const titre =
    nom && typeof nom === "object"
      ? [nom.prenoms, nom.nom].filter(Boolean).join(" ")
      : typeof nom === "string"
        ? nom
        : String(data?.identifiant ?? "");

  return (
    <>
      <div>
        <h1 className="text-4xl">Profil</h1>
        <p className="mt-2 text-sm text-ink/70">
          La fiche vient du compte connecté. Un assuré ou un professionnel ne voit que la personne qui lui est
          rattachée.
        </p>
      </div>
      <Carte>
        {data ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/60">Nom</dt>
              <dd className="font-semibold">{titre || "—"}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Rôle</dt>
              <dd>{String(data.role ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-ink/60">Lien</dt>
              <dd className="font-mono text-xs">{String(data.lien ?? data.motif ?? "—")}</dd>
            </div>
            {data.type ? (
              <div>
                <dt className="text-ink/60">Type</dt>
                <dd>{String(data.type)}</dd>
              </div>
            ) : null}
            {data.rang ? (
              <div>
                <dt className="text-ink/60">Rang</dt>
                <dd>{String(data.rang)}</dd>
              </div>
            ) : null}
            {data.ville ? (
              <div>
                <dt className="text-ink/60">Ville</dt>
                <dd>{String(data.ville)}</dd>
              </div>
            ) : null}
            {data.statut ? (
              <div>
                <dt className="text-ink/60">Statut</dt>
                <dd>{String(data.statut)}</dd>
              </div>
            ) : null}
            {contrat ? (
              <div className="sm:col-span-2">
                <dt className="text-ink/60">Contrat</dt>
                <dd>
                  {contrat.contrat_id} · {contrat.formule ?? "—"} · {contrat.statut ?? "—"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-sm">Lecture…</p>
        )}
        {reponse && reponse.status !== 200 ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </Carte>
    </>
  );
}
