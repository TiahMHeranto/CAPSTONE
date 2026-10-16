"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Ligne = {
  ordonnance_id: string;
  date_prescription: string | null;
  validite_jours: number | null;
  prescripteur_id: string | null;
};

export default function Page() {
  const [reponse, setReponse] = useState<Reponse | null>(null);

  useEffect(() => {
    appel("/me/ordonnances").then(setReponse);
  }, []);

  const lignes = (reponse?.data.ordonnances as Ligne[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">Ordonnances</h1>
        <p className="mt-2 text-sm text-ink/70">
          Un assuré voit les ordonnances de son pseudonyme. Un professionnel voit celles qu&apos;il a prescrites.
        </p>
      </div>
      <Carte>
        {reponse?.status === 200 && lignes.length === 0 ? <p className="text-sm">Aucune ordonnance.</p> : null}
        <ul className="divide-y divide-line text-sm">
          {lignes.map((ligne) => (
            <li key={ligne.ordonnance_id} className="flex flex-wrap justify-between gap-2 py-3">
              <span className="font-semibold">{ligne.ordonnance_id}</span>
              <span>
                {ligne.date_prescription ?? "—"} · {ligne.validite_jours ?? "—"} j · {ligne.prescripteur_id ?? "—"}
              </span>
            </li>
          ))}
        </ul>
        {reponse && reponse.status !== 200 ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
        {reponse ? null : <p className="text-sm">Lecture…</p>}
      </Carte>
    </>
  );
}
