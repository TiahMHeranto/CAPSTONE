"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, appelFichier, type Reponse } from "@/lib/api";
import { lireSession, type Role } from "@/lib/session";

type Dossier = {
  facture_id: string;
  statut: string | null;
  type_facture: string | null;
  montant_total: number | null;
  date_soin: string | null;
};

type Ligne = {
  code: string;
  type_ligne: string;
  quantite: number;
  prix_unitaire: number;
  montant: number;
};

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
  const [assureId, setAssureId] = useState("");
  const [prestataireId, setPrestataireId] = useState("");
  const [ordonnanceId, setOrdonnanceId] = useState("");
  const [contratId, setContratId] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([
    { code: "", type_ligne: "ACTE", quantite: 1, prix_unitaire: 15000, montant: 15000 },
  ]);
  const [recherche, setRecherche] = useState("FAC-MODELE-0001");
  const [lot, setLot] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [dossier, setDossier] = useState<Dossier[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [canal, setCanal] = useState("saisie");
  const [fichier, setFichier] = useState<File | null>(null);

  useEffect(() => {
    const session = lireSession();
    const actuel = session?.role ?? null;
    setRole(actuel);
    setFactureId(identifiantFacture());
    if (actuel === "assure" || actuel === "prestataire") {
      appel("/me/factures").then((recu) => {
        if (recu.status === 200) setDossier((recu.data.factures as Dossier[]) ?? []);
      });
    }
  }, []);

  const peutDeposer = role === "prestataire" || role === "gestionnaire";
  const peutValider = role === "prestataire" || role === "gestionnaire" || role === "administrateur";

  function modifierLigne(index: number, champLigne: keyof Ligne, valeur: string) {
    setLignes((actuelles) =>
      actuelles.map((ligne, position) => {
        if (position !== index) return ligne;
        if (champLigne === "code" || champLigne === "type_ligne") return { ...ligne, [champLigne]: valeur };
        return { ...ligne, [champLigne]: Number(valeur) };
      }),
    );
  }

  async function lirePdf() {
    if (!fichier) return;
    setEnCours(true);
    const recu = await appelFichier("/invoices/extract", fichier);
    setReponse(recu);
    setEnCours(false);
    if (recu.status !== 200) return;
    const liste = Array.isArray(recu.data.factures) ? recu.data.factures : [];
    if (liste.length > 1) {
      const lotLu = liste.map((item) => {
        const ligne = item as { facture?: unknown };
        return ligne.facture ?? item;
      });
      setLot(JSON.stringify(lotLu));
    }
    const facture = (recu.data.facture ?? {}) as Record<string, unknown>;
    if (typeof facture.facture_id === "string") setFactureId(facture.facture_id);
    if (typeof facture.type_facture === "string") setTypeFacture(facture.type_facture);
    if (typeof facture.date_soin === "string") setDateSoin(facture.date_soin);
    if (typeof facture.date_facture === "string") setDateFacture(facture.date_facture);
    if (typeof facture.assure_id === "string") setAssureId(facture.assure_id);
    if (typeof facture.ordonnance_id === "string") setOrdonnanceId(facture.ordonnance_id);
    if (typeof facture.contrat_id === "string") setContratId(facture.contrat_id);
    if (typeof facture.prestataire_id === "string") setPrestataireId(facture.prestataire_id);
    if (typeof facture.montant_total === "number") setMontant(facture.montant_total);
    const lues = Array.isArray(facture.lignes) ? (facture.lignes as Ligne[]) : [];
    if (lues.length) setLignes(lues);
    setCanal("pdf");
  }

  function corps() {
    return {
      facture_id: factureId,
      type_facture: typeFacture,
      date_soin: dateSoin,
      date_facture: dateFacture,
      montant_total: Number(montant),
      devise: "MGA",
      canal_reception: canal,
      prestataire_id: prestataireId || null,
      assure_id: assureId || null,
      contrat_id: contratId || null,
      ordonnance_id: ordonnanceId || null,
      lignes,
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
      {role === "assure" || role === "prestataire" ? (
        <Carte titre="Dossier du compte">
          {dossier.length === 0 ? (
            <p className="text-sm">Aucune facture pour la personne rattachée à ce compte.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {dossier.map((ligne) => (
                <li key={ligne.facture_id} className="flex flex-wrap justify-between gap-2 py-3">
                  <a className="font-semibold text-teal" href={`/factures/${ligne.facture_id}`}>
                    {ligne.facture_id}
                  </a>
                  <span>
                    {ligne.type_facture ?? "—"} · {ligne.statut ?? "—"} · {ligne.montant_total ?? "—"} ·{" "}
                    {ligne.date_soin ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Carte>
      ) : null}
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
        <Carte titre="Importer une facture PDF">
          <p className="mb-3 text-sm">
            Deux entrées : ce PDF, ou la saisie du formulaire. Le fichier part au workflow, le texte est lu sur
            place, puis le modèle local remplit les champs. Le dépôt n&apos;a lieu qu&apos;avec Déposer et scorer.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="text-sm"
              type="file"
              accept="application/pdf"
              onChange={(event) => setFichier(event.target.files?.[0] ?? null)}
            />
            <button className={boutonSecond} type="button" disabled={enCours || !fichier} onClick={() => void lirePdf()}>
              Lire le PDF
            </button>
          </div>
          {canal === "pdf" && lignes.length > 1 ? (
            <p className="mt-3 text-sm">{lignes.length} lignes lues, modifiables dans le formulaire.</p>
          ) : null}
        </Carte>
      ) : null}
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
              <Etiquette>Assuré</Etiquette>
              <input className={champ} value={assureId} onChange={(event) => setAssureId(event.target.value)} />
            </label>
            <label>
              <Etiquette>Ordonnance</Etiquette>
              <input className={champ} value={ordonnanceId} onChange={(event) => setOrdonnanceId(event.target.value)} />
            </label>
            <label>
              <Etiquette>Contrat</Etiquette>
              <input className={champ} value={contratId} onChange={(event) => setContratId(event.target.value)} />
            </label>
            <label>
              <Etiquette>Prestataire</Etiquette>
              <input
                className={champ}
                value={prestataireId}
                onChange={(event) => setPrestataireId(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3">
            {lignes.map((ligne, index) => (
              <div key={index} className="grid gap-3 rounded-md border border-line p-3 md:grid-cols-5">
                <label>
                  <Etiquette>Code</Etiquette>
                  <input
                    className={champ}
                    value={ligne.code}
                    onChange={(event) => modifierLigne(index, "code", event.target.value)}
                  />
                </label>
                <label>
                  <Etiquette>Type de ligne</Etiquette>
                  <input
                    className={champ}
                    value={ligne.type_ligne}
                    onChange={(event) => modifierLigne(index, "type_ligne", event.target.value)}
                  />
                </label>
                <label>
                  <Etiquette>Quantité</Etiquette>
                  <input
                    className={champ}
                    type="number"
                    value={ligne.quantite}
                    onChange={(event) => modifierLigne(index, "quantite", event.target.value)}
                  />
                </label>
                <label>
                  <Etiquette>Prix</Etiquette>
                  <input
                    className={champ}
                    type="number"
                    value={ligne.prix_unitaire}
                    onChange={(event) => modifierLigne(index, "prix_unitaire", event.target.value)}
                  />
                </label>
                <label>
                  <Etiquette>Montant ligne</Etiquette>
                  <input
                    className={champ}
                    type="number"
                    value={ligne.montant}
                    onChange={(event) => modifierLigne(index, "montant", event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={boutonSecond} type="button" disabled={enCours} onClick={() => envoyer("/invoices/validate")}>
              Valider
            </button>
            {peutDeposer ? (
              <button
                className={bouton}
                type="button"
                disabled={enCours || !lignes.some((ligne) => ligne.code.trim())}
                onClick={() => envoyer("/invoices")}
              >
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
