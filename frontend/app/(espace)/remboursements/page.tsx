"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Ligne = { facture_id: string; statut: string | null; montant_total: number | null; date_soin: string | null };

export default function Page() {
  const [reponse, setReponse] = useState<Reponse | null>(null);

  useEffect(() => {
    appel("/me/remboursements").then(setReponse);
  }, []);

  const lignes = (reponse?.data.remboursements as Ligne[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">Remboursements</h1>
        <p className="mt-2 text-sm text-ink/70">
          Factures dont le pseudonyme est celui du jeton. La liste reste vide si le compte n&apos;a pas d&apos;assuré lié.
        </p>
      </div>
      <Carte>
        {reponse?.status === 200 && lignes.length === 0 ? (
          <p className="text-sm">Aucun remboursement pour ce compte.</p>
        ) : null}
        <ul className="divide-y divide-line text-sm">
          {lignes.map((ligne) => (
            <li key={ligne.facture_id} className="flex flex-wrap justify-between gap-2 py-3">
              <a className="font-semibold text-teal" href={`/factures/${ligne.facture_id}`}>
                {ligne.facture_id}
              </a>
              <span>
                {ligne.statut ?? "—"} · {ligne.montant_total ?? "—"} · {ligne.date_soin ?? "—"}
              </span>
            </li>
          ))}
        </ul>
        {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : <p className="text-sm">Lecture…</p>}
      </Carte>
    </>
  );
}
