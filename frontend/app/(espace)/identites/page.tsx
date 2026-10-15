"use client";

import { FormEvent, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

const VIDE = "0".repeat(64);

export default function Page() {
  const [pseudo, setPseudo] = useState(VIDE);
  const [clef, setClef] = useState("");
  const [confirme, setConfirme] = useState(false);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function agir(chemin: string) {
    setEnCours(true);
    setReponse(await appel(chemin, { method: "POST", body: { pseudo_id: pseudo }, clefAdmin: clef }));
    setEnCours(false);
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Identités</h1>
        <p className="mt-2 text-sm text-ink/70">
          Ces deux actions exigent la clef administrateur. Elles sont auditées. L&apos;effacement retire le coffre de ce
          pseudonyme.
        </p>
      </div>
      <Carte>
        <form
          className="space-y-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
          }}
        >
          <label>
            <Etiquette>Pseudonyme, 64 caractères hexadécimaux</Etiquette>
            <input className={`${champ} font-mono text-xs`} value={pseudo} onChange={(event) => setPseudo(event.target.value)} />
          </label>
          <label>
            <Etiquette>Clef administrateur</Etiquette>
            <input
              className={champ}
              type="password"
              autoComplete="off"
              value={clef}
              onChange={(event) => setClef(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={boutonSecond} type="button" disabled={enCours || !clef} onClick={() => agir("/admin/reidentify")}>
              Réidentifier
            </button>
            <button
              className={bouton}
              type="button"
              disabled={enCours || !clef || !confirme}
              onClick={() => agir("/admin/erase")}
            >
              Effacer
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirme} onChange={(event) => setConfirme(event.target.checked)} />
            Je confirme l&apos;effacement de ce pseudonyme.
          </label>
        </form>
        {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </Carte>
    </>
  );
}
