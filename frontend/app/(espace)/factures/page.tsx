"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { lireSession, type Role } from "@/lib/session";

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

function identifiantFacture() {
  return `FAC-UI-${Date.now().toString(36).toUpperCase()}`;
}

export default function Page() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [factureId, setFactureId] = useState("");
  const [typeFacture, setTypeFacture] = useState("CONSULTATION");
  const [dateSoin, setDateSoin] = useState(aujourdHui);
  const [dateFacture, setDateFacture] = useState(aujourdHui);
  const [montant, setMontant] = useState(15000);
  const [code, setCode] = useState("ACC-CESAR");
  const [typeLigne, setTypeLigne] = useState("ACTE");
  const [assureId, setAssureId] = useState("");
  const [prestataireId, setPrestataireId] = useState("");
  const [ordonnanceId, setOrdonnanceId] = useState("");
  const [recherche, setRecherche] = useState("FAC-MODELE-0001");
  const [lot, setLot] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    setRole(lireSession()?.role ?? null);
    setFactureId(identifiantFacture());
  }, []);

  const peutDeposer = role === "prestataire" || role === "gestionnaire";
  const peutValider = role === "prestataire" || role === "gestionnaire" || role === "administrateur";

  function corps() {
    return {
      facture_id: factureId,
      type_facture: typeFacture,
      date_soin: dateSoin,
      date_facture: dateFacture,
      montant_total: Number(montant),
      devise: "MGA",
      prestataire_id: prestataireId || null,
      assure_id: assureId || null,
      ordonnance_id: ordonnanceId || null,
      lignes: [
        {
          code,
          type_ligne: typeLigne,
          quantite: 1,
          prix_unitaire: Number(montant),
          montant: Number(montant),
        },
      ],
    };
  }

  async function envoyer(chemin: string) {
    setEnCours(true);
    const recu = await appel(chemin, { method: "POST", body: corps() });
    setReponse(recu);
    setEnCours(false);
    if (chemin === "/invoices" && recu.status === 200) {
      router.push(`/factures/${factureId}`);
    }
  }

  async function envoyerLot(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    try {
      const lu = JSON.parse(lot) as unknown;
      const factures = Array.isArray(lu) ? lu : (lu as { factures?: unknown }).factures;
      const recu = await appel("/invoices/batch", { method: "POST", body: { factures } });
      setReponse(recu);
    } catch {
      setReponse({ status: 0, data: { code: "JSON_ILLISIBLE", motif: "le lot n'est pas un JSON valide" } });
    }
    setEnCours(false);
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Factures</h1>
        <p className="mt-2 text-sm text-ink/70">
          Valider ne score pas. Déposer enregistre la facture et le score. Un identifiant déjà présent revient en
          doublon.
        </p>
      </div>
      <Carte titre="Lire une facture">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(`/factures/${recherche.trim()}`);
          }}
        >
          <input className={champ} value={recherche} onChange={(event) => setRecherche(event.target.value)} />
          <button className={bouton} type="submit">
            Ouvrir
          </button>
        </form>
      </Carte>
      {peutValider ? (
        <Carte titre="Nouvelle facture">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <Etiquette>Identifiant</Etiquette>
              <input className={champ} value={factureId} onChange={(event) => setFactureId(event.target.value)} />
            </label>
            <label>
              <Etiquette>Type</Etiquette>
              <input className={champ} value={typeFacture} onChange={(event) => setTypeFacture(event.target.value)} />
            </label>
            <label>
              <Etiquette>Date de soin</Etiquette>
              <input className={champ} type="date" value={dateSoin} onChange={(event) => setDateSoin(event.target.value)} />
            </label>
            <label>
              <Etiquette>Date de facture</Etiquette>
              <input
                className={champ}
                type="date"
                value={dateFacture}
                onChange={(event) => setDateFacture(event.target.value)}
              />
            </label>
            <label>
              <Etiquette>Montant MGA</Etiquette>
              <input
                className={champ}
                type="number"
                value={montant}
                onChange={(event) => setMontant(Number(event.target.value))}
              />
            </label>
            <label>
              <Etiquette>Code référentiel</Etiquette>
              <input className={champ} value={code} onChange={(event) => setCode(event.target.value)} />
            </label>
            <label>
              <Etiquette>Type de ligne</Etiquette>
              <select className={champ} value={typeLigne} onChange={(event) => setTypeLigne(event.target.value)}>
                <option value="ACTE">ACTE</option>
                <option value="MEDICAMENT">MEDICAMENT</option>
              </select>
            </label>
            <label>
              <Etiquette>Pseudonyme assuré</Etiquette>
              <input className={champ} value={assureId} onChange={(event) => setAssureId(event.target.value)} />
            </label>
            <label>
              <Etiquette>Ordonnance</Etiquette>
              <input className={champ} value={ordonnanceId} onChange={(event) => setOrdonnanceId(event.target.value)} />
            </label>
            <label className="md:col-span-2">
              <Etiquette>Identifiant prestataire</Etiquette>
              <input
                className={champ}
                value={prestataireId}
                onChange={(event) => setPrestataireId(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={boutonSecond} type="button" disabled={enCours} onClick={() => envoyer("/invoices/validate")}>
              Valider
            </button>
            {peutDeposer ? (
              <button className={bouton} type="button" disabled={enCours} onClick={() => envoyer("/invoices")}>
                Déposer et scorer
              </button>
            ) : (
              <p className="self-center text-sm text-ink/70">Le dépôt est réservé au professionnel et au gestionnaire.</p>
            )}
          </div>
        </Carte>
      ) : (
        <Carte titre="Dépôt">
          <p className="text-sm">L&apos;assuré consulte ses factures. Il ne les dépose pas.</p>
        </Carte>
      )}
      {peutDeposer ? (
        <Carte titre="Lot">
          <form onSubmit={envoyerLot}>
            <Etiquette>JSON : une facture, ou une liste</Etiquette>
            <textarea
              className={`${champ} min-h-36 font-mono text-xs`}
              value={lot}
              placeholder='[{"facture_id":"FAC-LOT-1","type_facture":"CONSULTATION","date_soin":"2026-10-15","date_facture":"2026-10-15","montant_total":15000,"lignes":[{"code":"ACC-CESAR","type_ligne":"ACTE","quantite":1,"prix_unitaire":15000,"montant":15000}]}]'
              onChange={(event) => setLot(event.target.value)}
            />
            <button className={`${bouton} mt-3`} disabled={enCours || !lot.trim()} type="submit">
              Déposer le lot
            </button>
          </form>
        </Carte>
      ) : null}
      {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
    </>
  );
}
