"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { lireSession } from "@/lib/session";

type Ligne = {
  ordonnance_id: string;
  date_prescription: string | null;
  validite_jours: number | null;
  assure_id?: string | null;
};

type Personne = { assure_id: string; nom: string; ville?: string | null; rang?: string | null };
type Code = { code: string; libelle?: string | null; type_ligne: string };

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [role, setRole] = useState<string | null>(null);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [codes, setCodes] = useState<Code[]>([]);
  const [assureId, setAssureId] = useState("");
  const [datePrescription, setDatePrescription] = useState(aujourdHui);
  const [validite, setValidite] = useState(10);
  const [code, setCode] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [enCours, setEnCours] = useState(false);
  const [creation, setCreation] = useState<Reponse | null>(null);

  function charger() {
    appel("/me/ordonnances").then(setReponse);
  }

  useEffect(() => {
    const session = lireSession();
    setRole(session?.role ?? null);
    charger();
    if (session?.role === "prestataire") {
      appel("/me/assures").then((recu) => {
        if (recu.status === 200) setPersonnes((recu.data.personnes as Personne[]) ?? []);
      });
      appel("/me/referentiel").then((recu) => {
        if (recu.status === 200) setCodes((recu.data.codes as Code[]) ?? []);
      });
    }
  }, []);

  const lignes = (reponse?.data.ordonnances as Ligne[] | undefined) ?? [];
  const noms = new Map(personnes.map((personne) => [personne.assure_id, personne.nom]));
  const actes = codes.filter((item) => item.type_ligne === "ACTE");
  const medicaments = codes.filter((item) => item.type_ligne === "MEDICAMENT");

  async function creer(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    const recu = await appel("/me/ordonnances", {
      method: "POST",
      body: {
        assure_id: assureId,
        date_prescription: datePrescription,
        validite_jours: Number(validite),
        lignes: [{ code, quantite: Number(quantite) }],
      },
    });
    setCreation(recu);
    setEnCours(false);
    if (recu.status === 201) {
      setCode("");
      charger();
    }
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Ordonnances</h1>
        <p className="mt-2 text-sm text-ink/70">
          Un assuré voit les ordonnances de son dossier. Un professionnel crée une ordonnance, puis peut l&apos;attacher
          à une facture.
        </p>
      </div>
      {role === "prestataire" ? (
        <Carte titre="Nouvelle ordonnance">
          <form className="grid gap-3 md:grid-cols-2" onSubmit={creer}>
            <label className="md:col-span-2">
              <Etiquette>Assuré</Etiquette>
              <select className={champ} value={assureId} onChange={(event) => setAssureId(event.target.value)}>
                <option value="">Choisir un nom</option>
                {personnes.map((personne) => {
                  const precision = [personne.ville, personne.rang].filter(Boolean).join(" · ");
                  return (
                    <option key={personne.assure_id} value={personne.assure_id}>
                      {personne.nom}
                      {precision ? ` — ${precision}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              <Etiquette>Date</Etiquette>
              <input
                className={champ}
                type="date"
                value={datePrescription}
                onChange={(event) => setDatePrescription(event.target.value)}
              />
            </label>
            <label>
              <Etiquette>Validité (jours)</Etiquette>
              <input
                className={champ}
                type="number"
                min={1}
                max={365}
                value={validite}
                onChange={(event) => setValidite(Number(event.target.value))}
              />
            </label>
            <label>
              <Etiquette>Code</Etiquette>
              <select className={champ} value={code} onChange={(event) => setCode(event.target.value)}>
                <option value="">Choisir un acte ou un médicament</option>
                <optgroup label="Actes">
                  {actes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.libelle ?? ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Médicaments">
                  {medicaments.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.libelle ?? ""}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              <Etiquette>Quantité</Etiquette>
              <input
                className={champ}
                type="number"
                min={1}
                value={quantite}
                onChange={(event) => setQuantite(Number(event.target.value))}
              />
            </label>
            <div className="md:col-span-2">
              <button className={bouton} type="submit" disabled={enCours || !assureId || !code || quantite <= 0}>
                Créer l&apos;ordonnance
              </button>
            </div>
          </form>
          {creation?.status === 201 ? (
            <p className="mt-4 text-sm">Ordonnance {String(creation.data.ordonnance_id)} enregistrée.</p>
          ) : null}
          {creation && creation.status !== 201 ? <Bandeau status={creation.status} data={creation.data} /> : null}
        </Carte>
      ) : null}
      <Carte>
        {reponse?.status === 200 && lignes.length === 0 ? <p className="text-sm">Aucune ordonnance.</p> : null}
        <ul className="divide-y divide-line text-sm">
          {lignes.map((ligne) => (
            <li key={ligne.ordonnance_id} className="flex flex-wrap justify-between gap-2 py-3">
              <span>
                <span className="font-semibold">{ligne.ordonnance_id}</span>
                {noms.get(ligne.assure_id ?? "") ? ` · ${noms.get(ligne.assure_id ?? "")}` : ""}
              </span>
              <span>
                {ligne.date_prescription ?? "—"} · {ligne.validite_jours ?? "—"} j
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
