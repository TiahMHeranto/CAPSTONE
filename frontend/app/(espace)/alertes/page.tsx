"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { lireSession } from "@/lib/session";

type Alerte = { facture_id: string; score: number; model_version: string; created_at: string };
type Journal = {
  id: number;
  facture_id: string;
  canal: string;
  statut: string;
  tentative: number;
  score: number | null;
  message: string;
  created_at: string;
};

export default function Page() {
  const [alertes, setAlertes] = useState<Reponse | null>(null);
  const [journal, setJournal] = useState<Reponse | null>(null);
  const [prescriptions, setPrescriptions] = useState<Reponse | null>(null);
  const [filtre, setFiltre] = useState("");
  const [admin, setAdmin] = useState(false);
  const [depot, setDepot] = useState<Reponse | null>(null);
  const [formulaire, setFormulaire] = useState({
    facture_id: "FAC-UI-JOURNAL",
    canal: "webhook",
    statut: "envoye",
    tentative: 1,
    score: "0.5",
    message: "Essai d'écran temporaire",
  });

  async function charger(statut = filtre) {
    setAlertes(await appel("/alerts"));
    setPrescriptions(await appel("/alerts/prescriptions"));
    const query = statut ? `?statut=${statut}` : "";
    setJournal(await appel(`/alerts/journal${query}`));
  }

  useEffect(() => {
    setAdmin(lireSession()?.role === "administrateur");
    charger("");
    // Chargement initial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function deposer(event: FormEvent) {
    event.preventDefault();
    const recu = await appel("/alerts/journal", {
      method: "POST",
      body: {
        ...formulaire,
        tentative: Number(formulaire.tentative),
        score: formulaire.score === "" ? null : Number(formulaire.score),
      },
    });
    setDepot(recu);
    if (recu.status === 201) await charger();
  }

  const liste = (alertes?.data.alertes as Alerte[] | undefined) ?? [];
  const lignes = (journal?.data.alertes as Journal[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">Alertes</h1>
        <p className="mt-2 text-sm text-ink/70">
          La file ne montre que les scores en alerte sans décision humaine. Le journal garde les envois.
        </p>
      </div>
      <Carte titre="À traiter">
        {alertes?.status === 200 ? (
          liste.length ? (
            <ul className="divide-y divide-line text-sm">
              {liste.map((alerte) => (
                <li key={alerte.facture_id} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                  <a className="font-semibold text-teal" href={`/factures/${alerte.facture_id}`}>
                    {alerte.facture_id}
                  </a>
                  <span>
                    {alerte.score} · {alerte.model_version}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">Aucune alerte en attente.</p>
          )
        ) : null}
        {alertes ? <Bandeau status={alertes.status} data={alertes.data} /> : null}
      </Carte>
      <Carte titre="Anomalies de prescription">
        {prescriptions?.status === 200 && Array.isArray(prescriptions.data.anomalies) ? (
          (prescriptions.data.anomalies as { facture_id: string; code: string; motif: string }[]).length ? (
            <ul className="divide-y divide-line text-sm">
              {(prescriptions.data.anomalies as { facture_id: string; code: string; motif: string }[]).map(
                (ligne) => (
                  <li key={`${ligne.facture_id}-${ligne.code}`} className="flex flex-wrap justify-between gap-2 py-3">
                    <a className="font-semibold text-teal" href={`/factures/${ligne.facture_id}`}>
                      {ligne.facture_id}
                    </a>
                    <span>
                      {ligne.code} — {ligne.motif}
                    </span>
                  </li>
                ),
              )}
            </ul>
          ) : (
            <p className="text-sm">Aucune anomalie de prescription.</p>
          )
        ) : null}
        {prescriptions ? <Bandeau status={prescriptions.status} data={prescriptions.data} /> : null}
      </Carte>
      <Carte titre="Journal des notifications">
        <div className="mb-4 flex flex-wrap gap-2">
          {["", "envoye", "echec"].map((valeur) => (
            <button
              key={valeur || "tous"}
              className={filtre === valeur ? bouton : boutonSecond}
              type="button"
              onClick={() => {
                setFiltre(valeur);
                charger(valeur);
              }}
            >
              {valeur || "Tous"}
            </button>
          ))}
        </div>
        {journal?.status === 200 ? (
          <ul className="space-y-3 text-sm">
            {lignes.map((ligne) => (
              <li key={ligne.id} className="rounded-lg border border-line p-3">
                <p className="font-semibold">
                  {ligne.facture_id} · {ligne.canal} · {ligne.statut}
                </p>
                <p className="mt-1 text-ink/80">{ligne.message}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {journal ? <Bandeau status={journal.status} data={journal.data} /> : null}
      </Carte>
      {admin ? (
        <Carte titre="Écrire dans le journal">
          <form onSubmit={deposer} className="grid gap-3 md:grid-cols-2">
            <label>
              <Etiquette>Facture</Etiquette>
              <input
                className={champ}
                value={formulaire.facture_id}
                onChange={(event) => setFormulaire({ ...formulaire, facture_id: event.target.value })}
              />
            </label>
            <label>
              <Etiquette>Canal</Etiquette>
              <select
                className={champ}
                value={formulaire.canal}
                onChange={(event) => setFormulaire({ ...formulaire, canal: event.target.value })}
              >
                <option value="webhook">webhook</option>
                <option value="slack">slack</option>
                <option value="email">email</option>
              </select>
            </label>
            <label>
              <Etiquette>Statut</Etiquette>
              <select
                className={champ}
                value={formulaire.statut}
                onChange={(event) => setFormulaire({ ...formulaire, statut: event.target.value })}
              >
                <option value="envoye">envoye</option>
                <option value="echec">echec</option>
              </select>
            </label>
            <label>
              <Etiquette>Tentative</Etiquette>
              <input
                className={champ}
                type="number"
                min={1}
                max={5}
                value={formulaire.tentative}
                onChange={(event) => setFormulaire({ ...formulaire, tentative: Number(event.target.value) })}
              />
            </label>
            <label className="md:col-span-2">
              <Etiquette>Message</Etiquette>
              <textarea
                className={`${champ} min-h-20`}
                value={formulaire.message}
                onChange={(event) => setFormulaire({ ...formulaire, message: event.target.value })}
              />
            </label>
            <button className={bouton} type="submit">
              Enregistrer
            </button>
          </form>
          {depot ? <Bandeau status={depot.status} data={depot.data} /> : null}
        </Carte>
      ) : null}
    </>
  );
}
