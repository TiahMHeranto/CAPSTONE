"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { lireSession } from "@/lib/session";

type Explication = { variable?: string; contribution?: number; libelle?: string };

export default function Page() {
  const params = useParams<{ id: string }>();
  const factureId = decodeURIComponent(params.id);
  const [facture, setFacture] = useState<Reponse | null>(null);
  const [prediction, setPrediction] = useState<Reponse | null>(null);
  const [decision, setDecision] = useState("complement");
  const [motif, setMotif] = useState("");
  const [suite, setSuite] = useState<Reponse | null>(null);
  const [gestionnaire, setGestionnaire] = useState(false);

  async function charger() {
    const lue = await appel(`/invoices/${encodeURIComponent(factureId)}`);
    setFacture(lue);
    const role = lireSession()?.role;
    setGestionnaire(role === "gestionnaire");
    if (role === "gestionnaire" || role === "administrateur") {
      setPrediction(await appel(`/predictions/${encodeURIComponent(factureId)}`));
    }
  }

  useEffect(() => {
    charger();
    // Le chargement suit l'identifiant d'URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [factureId]);

  async function trancher(event: FormEvent) {
    event.preventDefault();
    const recu = await appel(`/invoices/${encodeURIComponent(factureId)}/decisions`, {
      method: "POST",
      body: { decision, motif },
    });
    setSuite(recu);
    if (recu.status === 200) await charger();
  }

  const corps = facture?.data ?? {};
  const score = prediction?.status === 200 ? prediction.data : null;
  const explications = (score?.explications as Explication[] | undefined) ?? [];

  return (
    <>
      <div>
        <h1 className="text-4xl">{factureId}</h1>
        <p className="mt-2 text-sm text-ink/70">Lecture limitée au rôle : un professionnel ne voit que ses dépôts.</p>
      </div>
      {facture ? (
        <Carte titre="Facture">
          {facture.status === 200 ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <Etiquette>Statut</Etiquette>
                {String(corps.statut ?? "—")}
              </div>
              <div>
                <Etiquette>Montant</Etiquette>
                {String(corps.montant_total ?? "—")} {String(corps.devise ?? "")}
              </div>
              <div>
                <Etiquette>Type</Etiquette>
                {String(corps.type_facture ?? "—")}
              </div>
              <div>
                <Etiquette>Soin</Etiquette>
                {String(corps.date_soin ?? "—")}
              </div>
              <div>
                <Etiquette>Score</Etiquette>
                {corps.score == null ? "—" : String(corps.score)}
              </div>
              <div>
                <Etiquette>Classe</Etiquette>
                <span className={corps.classe === "alerte" ? "font-semibold text-amber" : ""}>
                  {String(corps.classe ?? "—")}
                </span>
              </div>
              <div>
                <Etiquette>Version</Etiquette>
                {String(corps.model_version ?? "—")}
              </div>
              <div>
                <Etiquette>Décision</Etiquette>
                {corps.decision ? JSON.stringify(corps.decision) : "aucune"}
              </div>
              <div className="sm:col-span-2">
                <Etiquette>Ordonnance</Etiquette>
                {Array.isArray(corps.anomalies_prescription) && corps.anomalies_prescription.length
                  ? (corps.anomalies_prescription as { code: string; motif: string }[])
                      .map((item) => `${item.code} — ${item.motif}`)
                      .join(" · ")
                  : "aucune anomalie"}
              </div>
            </dl>
          ) : null}
          <Bandeau status={facture.status} data={facture.data} />
        </Carte>
      ) : (
        <p className="text-sm text-ink/70">Lecture…</p>
      )}
      {score ? (
        <Carte titre="Contributions">
          <ul className="space-y-2 text-sm">
            {explications.map((item) => (
              <li key={item.variable} className="flex items-baseline justify-between gap-4 border-b border-line py-2">
                <span>{item.libelle || item.variable}</span>
                <span className="font-semibold tabular-nums">{Number(item.contribution).toFixed(3)}</span>
              </li>
            ))}
          </ul>
        </Carte>
      ) : prediction ? (
        <Bandeau status={prediction.status} data={prediction.data} />
      ) : null}
      {gestionnaire ? (
        <Carte titre="Décision humaine">
          <form onSubmit={trancher} className="space-y-3">
            <label>
              <Etiquette>Décision</Etiquette>
              <select className={champ} value={decision} onChange={(event) => setDecision(event.target.value)}>
                <option value="valider">Valider</option>
                <option value="rejeter">Rejeter</option>
                <option value="complement">Demander un complément</option>
              </select>
            </label>
            <label>
              <Etiquette>Motif</Etiquette>
              <textarea className={`${champ} min-h-24`} value={motif} onChange={(event) => setMotif(event.target.value)} />
            </label>
            <button className={bouton} type="submit" disabled={!motif.trim()}>
              Enregistrer
            </button>
          </form>
          {suite ? <Bandeau status={suite.status} data={suite.data} /> : null}
        </Carte>
      ) : null}
    </>
  );
}
