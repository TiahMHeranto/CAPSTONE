"use client";

import { useEffect, useState } from "react";
import { Bandeau, Carte, boutonSecond } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type Relation = {
  schema: string;
  nom: string;
  genre: string;
  nb: number;
};

type PageLignes = {
  schema: string;
  table: string;
  total: number;
  limit: number;
  offset: number;
  colonnes: string[];
  lignes: Record<string, unknown>[];
};

const LIMIT = 50;

function texte(valeur: unknown) {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "object") return JSON.stringify(valeur);
  return String(valeur);
}

export default function Page() {
  const [catalogue, setCatalogue] = useState<Reponse | null>(null);
  const [page, setPage] = useState<Reponse | null>(null);
  const [choix, setChoix] = useState("app.factures");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    appel("/read").then(setCatalogue);
  }, []);

  useEffect(() => {
    const [schema, table] = choix.split(".");
    if (!schema || !table) return;
    appel(`/read/${schema}/${table}?limit=${LIMIT}&offset=${offset}`).then(setPage);
  }, [choix, offset]);

  const relations = (catalogue?.data.relations as Relation[] | undefined) ?? [];
  const groupes = ["app", "clean", "bi"].map((schema) => ({
    schema,
    lignes: relations.filter((ligne) => ligne.schema === schema),
  }));
  const corps = page?.status === 200 ? (page.data as PageLignes) : null;
  const total = corps?.total ?? 0;
  const debut = total === 0 ? 0 : offset + 1;
  const fin = offset + (corps?.lignes.length ?? 0);

  function ouvrir(schema: string, nom: string) {
    setOffset(0);
    setChoix(`${schema}.${nom}`);
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Lecture</h1>
        <p className="mt-2 text-sm text-ink/70">
          Lecture seule, séparée des dépôts et du score. Les schémas raw, labels et le coffre d&apos;identités restent
          fermés pour le compte de l&apos;API. Le mot de passe des comptes et les vecteurs ne sont pas affichés.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <Carte titre="Relations">
          <div className="mb-3 flex flex-col gap-2">
            <button className={boutonSecond} type="button" onClick={() => ouvrir("app", "factures")}>
              Factures déposées
            </button>
            <button className={boutonSecond} type="button" onClick={() => ouvrir("clean", "factures")}>
              Factures historiques
            </button>
            <button className={boutonSecond} type="button" onClick={() => ouvrir("app", "alertes")}>
              Journal des alertes
            </button>
            <button className={boutonSecond} type="button" onClick={() => ouvrir("app", "audit_log")}>
              Journal d&apos;audit
            </button>
          </div>
          {groupes.map((groupe) => (
            <div key={groupe.schema} className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{groupe.schema}</p>
              <ul className="mt-1 text-sm">
                {groupe.lignes.map((ligne) => {
                  const actif = choix === `${ligne.schema}.${ligne.nom}`;
                  return (
                    <li key={`${ligne.schema}.${ligne.nom}`}>
                      <button
                        type="button"
                        className={`flex w-full justify-between py-1 text-left ${actif ? "font-semibold text-teal" : ""}`}
                        onClick={() => ouvrir(ligne.schema, ligne.nom)}
                      >
                        <span>{ligne.nom}</span>
                        <span className="text-ink/50">{ligne.nb}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {catalogue && catalogue.status !== 200 ? <Bandeau status={catalogue.status} data={catalogue.data} /> : null}
        </Carte>
        <Carte titre={corps ? `${corps.schema}.${corps.table}` : choix}>
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <p>
              {debut}–{fin} sur {total}
            </p>
            <div className="flex gap-2">
              <button
                className={boutonSecond}
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              >
                Précédent
              </button>
              <button
                className={boutonSecond}
                type="button"
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset(offset + LIMIT)}
              >
                Suivant
              </button>
            </div>
          </div>
          {corps ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line">
                    {corps.colonnes.map((colonne) => (
                      <th key={colonne} className="px-2 py-2 font-semibold">
                        {colonne}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corps.lignes.map((ligne, index) => (
                    <tr key={`${corps.offset}-${index}`} className="border-b border-line align-top">
                      {corps.colonnes.map((colonne) => (
                        <td key={colonne} className="max-w-xs truncate px-2 py-2">
                          {texte(ligne[colonne])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {corps.lignes.length === 0 ? <p className="mt-3 text-sm">Aucune ligne.</p> : null}
            </div>
          ) : null}
          {page && page.status !== 200 ? <Bandeau status={page.status} data={page.data} /> : null}
        </Carte>
      </div>
    </>
  );
}
