"use client";

import { FormEvent, useState } from "react";
import { Bandeau, Carte, bouton, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Source = { source: string; page: number | null };

export default function Page() {
  const [question, setQuestion] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function demander(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    setReponse(
      await appel("/assistant", {
        method: "POST",
        body: { question },
      }),
    );
    setEnCours(false);
  }

  const sources = (reponse?.data.sources as Source[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">Assistant</h1>
        <p className="mt-2 text-sm text-ink/70">
          Une question de garantie lit les contrats. Une question de dossier interroge les factures du compte connecté : le sien pour un assuré ou un établissement, toute la base dossier pour un administrateur.
          Un assuré reçoit les conditions générales de sa formule, pas celles des autres. Une question qui cherche à
          sortir de ce périmètre est refusée.
        </p>
      </div>
      <Carte>
        <form onSubmit={demander} className="space-y-3">
          <textarea
            className={`${champ} min-h-28`}
            value={question}
            placeholder="Quel est le plafond de la formule Essentiel ?"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button className={bouton} type="submit" disabled={enCours || !question.trim()}>
            {enCours ? "Recherche…" : "Demander"}
          </button>
        </form>
        {reponse?.status === 200 ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{String(reponse.data.reponse)}</p>
            {sources.length ? (
              <ul className="text-ink/70">
                {sources.map((source) => (
                  <li key={`${source.source}-${source.page}`}>
                    {source.source}
                    {source.page ? ` · page ${source.page}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
            {reponse.data.requete ? (
              <details className="text-ink/70">
                <summary>Requête vérifiée</summary>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{String(reponse.data.requete)}</pre>
              </details>
            ) : null}
            {reponse.data.cache ? <p className="text-ink/50">Réponse reprise du cache.</p> : null}
          </div>
        ) : null}
        {reponse && reponse.status !== 200 ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </Carte>
    </>
  );
}
