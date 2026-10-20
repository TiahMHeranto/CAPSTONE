"use client";

import { useState } from "react";
import Link from "next/link";
import { RiskBadge } from "@/components/domain/risk-badge";
import { ScoreRing } from "@/components/domain/score-ring";
import { ShapChart, type Explication } from "@/components/domain/shap-chart";
import { Button, Champ, Etiquette } from "@/components/ui";
import { confirmerOrdonnance, envoyerFacture, lireOrdonnance, lirePdf } from "@/features/invoices/api";
import { Depot } from "@/features/invoices/depot";
import { factureSchema, type FactureSaisie } from "@/features/invoices/schemas/facture";
import { messageErreur, t } from "@/i18n/traduire";

type Ligne = FactureSaisie["lignes"][number];
type LigneOrdonnance = { code: string; quantite: number };

type OrdonnanceSaisie = {
  ordonnance_id: string;
  assure_id: string;
  date_prescription: string;
  validite_jours: number;
  lignes: LigneOrdonnance[];
};

function aujourdHui() {
  return new Date().toISOString().slice(0, 10);
}

function vide(): FactureSaisie {
  return {
    facture_id: "",
    type_facture: "CONSULTATION",
    date_soin: aujourdHui(),
    date_facture: aujourdHui(),
    montant_total: 0,
    devise: "MGA",
    canal_reception: "saisie",
    prestataire_id: "",
    assure_id: "",
    contrat_id: "",
    ordonnance_id: "",
    lignes: [{ code: "", type_ligne: "ACTE", quantite: 1, prix_unitaire: 0, montant: 0 }],
  };
}

type ResultatScore = {
  factureId: string;
  score: number;
  classe: string | null;
  version: string;
  explications: Explication[];
};

function ordonnanceVide(): OrdonnanceSaisie {
  return {
    ordonnance_id: "",
    assure_id: "",
    date_prescription: aujourdHui(),
    validite_jours: 30,
    lignes: [{ code: "", quantite: 1 }],
  };
}

export function FormulaireFacture({
  peutDeposer,
  peutCreerOrdonnance,
}: {
  peutDeposer: boolean;
  peutCreerOrdonnance: boolean;
}) {
  const [facture, setFacture] = useState<FactureSaisie>(vide);
  const [ordonnance, setOrdonnance] = useState<OrdonnanceSaisie>(ordonnanceVide);
  const [ordonnanceOuverte, setOrdonnanceOuverte] = useState(false);
  const [message, setMessage] = useState("");
  const [resultat, setResultat] = useState<ResultatScore | null>(null);
  const [enCours, setEnCours] = useState(false);

  function maj(champ: keyof FactureSaisie, valeur: string) {
    setFacture((actuel) => ({ ...actuel, [champ]: valeur }));
  }

  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    setFacture((actuel) => ({
      ...actuel,
      lignes: actuel.lignes.map((ligne, position) => {
        if (position !== index) return ligne;
        if (champ === "code" || champ === "type_ligne") return { ...ligne, [champ]: valeur };
        return { ...ligne, [champ]: Number(valeur) };
      }),
    }));
  }

  async function soumettre(valider: boolean) {
    const corps = {
      ...facture,
      montant_total: Number(facture.montant_total),
      prestataire_id: facture.prestataire_id || null,
      assure_id: facture.assure_id || null,
      contrat_id: facture.contrat_id || null,
      ordonnance_id: facture.ordonnance_id || null,
    };
    const lu = factureSchema.safeParse(corps);
    if (!lu.success) {
      setMessage(t("erreur"));
      return;
    }
    setEnCours(true);
    setResultat(null);
    const recu = await envoyerFacture(lu.data, valider);
    setEnCours(false);
    const score = !valider && recu.status === 200 ? lireScore(recu.data) : null;
    if (score) {
      setResultat(score);
      setMessage("");
      return;
    }
    setMessage(recu.status === 200 ? t("factures.valider") : messageErreur(recu.data));
  }

  function pdf(fichier: File) {
    return fichier.type === "application/pdf" || fichier.name.toLowerCase().endsWith(".pdf");
  }

  async function chargerFacture(fichier: File) {
    if (!pdf(fichier)) {
      setMessage(t("factures.pdfSeul"));
      return;
    }
    setEnCours(true);
    setMessage(t("factures.lecture"));
    const recu = await lirePdf(fichier);
    setEnCours(false);
    if (recu.status !== 200) {
      setMessage(messageErreur(recu.data));
      return;
    }
    const lue = (recu.data.facture ?? {}) as Record<string, unknown>;
    setFacture((actuel) => ({
      ...actuel,
      facture_id: texte(lue.facture_id, actuel.facture_id),
      type_facture: texte(lue.type_facture, actuel.type_facture),
      date_soin: texte(lue.date_soin, actuel.date_soin),
      date_facture: texte(lue.date_facture, actuel.date_facture),
      assure_id: texte(lue.assure_id, actuel.assure_id ?? ""),
      ordonnance_id: texte(lue.ordonnance_id, actuel.ordonnance_id ?? ""),
      contrat_id: texte(lue.contrat_id, actuel.contrat_id ?? ""),
      prestataire_id: texte(lue.prestataire_id, actuel.prestataire_id ?? ""),
      montant_total: typeof lue.montant_total === "number" ? lue.montant_total : actuel.montant_total,
      canal_reception: "pdf",
      lignes: Array.isArray(lue.lignes) && lue.lignes.length ? (lue.lignes as Ligne[]) : actuel.lignes,
    }));
    setMessage(t("factures.pdfAide"));
  }

  async function chargerOrdonnance(fichier: File) {
    if (!pdf(fichier)) {
      setMessage(t("factures.pdfSeul"));
      return;
    }
    setEnCours(true);
    setMessage(t("factures.lecture"));
    const recu = await lireOrdonnance(fichier);
    setEnCours(false);
    if (recu.status !== 200) {
      setMessage(messageErreur(recu.data));
      return;
    }
    const lue = (recu.data.ordonnance ?? {}) as Record<string, unknown>;
    const lignes = Array.isArray(lue.lignes) ? (lue.lignes as LigneOrdonnance[]) : [];
    setOrdonnance({
      ordonnance_id: texte(lue.ordonnance_id, ""),
      assure_id: texte(lue.assure_id, ""),
      date_prescription: texte(lue.date_prescription, aujourdHui()),
      validite_jours: typeof lue.validite_jours === "number" ? lue.validite_jours : 30,
      lignes: lignes.length ? lignes : [{ code: "", quantite: 1 }],
    });
    setOrdonnanceOuverte(true);
    setMessage(t("factures.ordonnanceAide"));
  }

  async function validerOrdonnance() {
    const reference = ordonnance.ordonnance_id.trim();
    if (!peutCreerOrdonnance) {
      if (!reference) {
        setMessage(t("erreurs.ACCES_REFUSE"));
        return;
      }
      setFacture((actuel) => ({ ...actuel, ordonnance_id: reference }));
      setMessage(t("factures.ordonnanceReportee"));
      return;
    }
    setEnCours(true);
    const recu = await confirmerOrdonnance({
      assure_id: ordonnance.assure_id,
      date_prescription: ordonnance.date_prescription,
      validite_jours: Number(ordonnance.validite_jours),
      lignes: ordonnance.lignes
        .filter((ligne) => ligne.code.trim())
        .map((ligne) => ({ code: ligne.code.trim(), quantite: Number(ligne.quantite) })),
    });
    setEnCours(false);
    if (recu.status !== 201 && recu.status !== 200) {
      setMessage(messageErreur(recu.data));
      return;
    }
    const identifiant = texte(recu.data.ordonnance_id, reference);
    setOrdonnance((actuel) => ({ ...actuel, ordonnance_id: identifiant }));
    setFacture((actuel) => ({
      ...actuel,
      ordonnance_id: identifiant,
      assure_id: actuel.assure_id || ordonnance.assure_id,
    }));
    setMessage(t("factures.ordonnanceConfirmee"));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Depot
          consigne={t("factures.deposerPdf")}
          action={t("factures.scannerFacture")}
          occupe={enCours}
          onScanner={(fichier) => void chargerFacture(fichier)}
        />
        <Depot
          consigne={t("factures.deposerOrdonnance")}
          action={t("factures.scannerOrdonnance")}
          occupe={enCours}
          onScanner={(fichier) => void chargerOrdonnance(fichier)}
        />
      </div>
      <p className="text-sm text-muted">{t("factures.pdfAide")}</p>
      {ordonnanceOuverte ? (
        <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-xl font-semibold">{t("factures.ordonnance")}</h2>
          <p className="text-sm text-muted">{t("factures.ordonnanceAide")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Saisie
              label="factures.ordonnance"
              value={ordonnance.ordonnance_id}
              onChange={(v) => setOrdonnance((actuel) => ({ ...actuel, ordonnance_id: v }))}
            />
            <Saisie
              label="factures.assure"
              value={ordonnance.assure_id}
              onChange={(v) => setOrdonnance((actuel) => ({ ...actuel, assure_id: v }))}
            />
            <Saisie
              label="factures.datePrescription"
              type="date"
              value={ordonnance.date_prescription}
              onChange={(v) => setOrdonnance((actuel) => ({ ...actuel, date_prescription: v }))}
            />
            <Saisie
              label="factures.validite"
              type="number"
              value={String(ordonnance.validite_jours)}
              onChange={(v) => setOrdonnance((actuel) => ({ ...actuel, validite_jours: Number(v) }))}
            />
          </div>
          {ordonnance.lignes.map((ligne, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-2">
              <Saisie
                label="factures.code"
                value={ligne.code}
                onChange={(v) =>
                  setOrdonnance((actuel) => ({
                    ...actuel,
                    lignes: actuel.lignes.map((item, position) => (position === index ? { ...item, code: v } : item)),
                  }))
                }
              />
              <Saisie
                label="factures.quantite"
                type="number"
                value={String(ligne.quantite)}
                onChange={(v) =>
                  setOrdonnance((actuel) => ({
                    ...actuel,
                    lignes: actuel.lignes.map((item, position) =>
                      position === index ? { ...item, quantite: Number(v) } : item,
                    ),
                  }))
                }
              />
            </div>
          ))}
          <Button type="button" variante="secondary" disabled={enCours} onClick={() => void validerOrdonnance()}>
            {t("factures.confirmerOrdonnance")}
          </Button>
        </section>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Saisie label="factures.identifiant" value={facture.facture_id} onChange={(v) => maj("facture_id", v)} />
        <Saisie label="factures.type" value={facture.type_facture} onChange={(v) => maj("type_facture", v)} />
        <Saisie label="factures.soin" type="date" value={facture.date_soin} onChange={(v) => maj("date_soin", v)} />
        <Saisie label="factures.emission" type="date" value={facture.date_facture} onChange={(v) => maj("date_facture", v)} />
        <Saisie label="factures.montant" type="number" value={String(facture.montant_total)} onChange={(v) => setFacture((a) => ({ ...a, montant_total: Number(v) }))} />
        <Saisie label="factures.assure" value={facture.assure_id ?? ""} onChange={(v) => maj("assure_id", v)} />
        <Saisie label="factures.ordonnance" value={facture.ordonnance_id ?? ""} onChange={(v) => maj("ordonnance_id", v)} />
        <Saisie label="factures.contrat" value={facture.contrat_id ?? ""} onChange={(v) => maj("contrat_id", v)} />
        <Saisie label="factures.prestataire" value={facture.prestataire_id ?? ""} onChange={(v) => maj("prestataire_id", v)} />
      </div>
      {facture.lignes.map((ligne, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-5">
          <Saisie label="factures.code" value={ligne.code} onChange={(v) => majLigne(index, "code", v)} />
          <Saisie label="factures.typeLigne" value={ligne.type_ligne} onChange={(v) => majLigne(index, "type_ligne", v)} />
          <Saisie label="factures.quantite" type="number" value={String(ligne.quantite)} onChange={(v) => majLigne(index, "quantite", v)} />
          <Saisie label="factures.prix" type="number" value={String(ligne.prix_unitaire)} onChange={(v) => majLigne(index, "prix_unitaire", v)} />
          <Saisie label="factures.montantLigne" type="number" value={String(ligne.montant)} onChange={(v) => majLigne(index, "montant", v)} />
        </div>
      ))}
      {message ? <p role="status">{message}</p> : null}
      {resultat ? <ResultatDepot resultat={resultat} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button variante="secondary" type="button" disabled={enCours} onClick={() => soumettre(true)}>
          {t("factures.valider")}
        </Button>
        {peutDeposer ? (
          <Button type="button" disabled={enCours} onClick={() => soumettre(false)}>
            {t("factures.deposer")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ResultatDepot({ resultat }: { resultat: ResultatScore }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4" role="status">
      <h2 className="text-xl font-semibold">{t("factures.resultat")}</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <ScoreRing valeur={resultat.score} classe={resultat.classe} />
        <div>
          <p className="font-mono">{resultat.factureId}</p>
          <RiskBadge valeur={resultat.score} classe={resultat.classe} />
          {resultat.version ? (
            <p className="mt-1 text-sm text-muted">
              {t("factures.version")} {resultat.version}
            </p>
          ) : null}
        </div>
      </div>
      <h3 className="mb-2 mt-4 text-lg">{t("factures.pourquoiScore")}</h3>
      <ShapChart lignes={resultat.explications} />
      <p className="mt-3 text-sm">
        <Link href={`/factures/${resultat.factureId}`}>{t("factures.ouvrir")}</Link>
      </p>
    </section>
  );
}

function lireScore(data: Record<string, unknown>): ResultatScore | null {
  const prediction = data.prediction;
  if (!prediction || typeof prediction !== "object") return null;
  const corps = prediction as Record<string, unknown>;
  if (typeof corps.score !== "number") return null;
  const explications = Array.isArray(corps.explications)
    ? corps.explications.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const ligne = item as Record<string, unknown>;
        if (typeof ligne.variable !== "string" || typeof ligne.contribution !== "number") return [];
        return [
          {
            variable: ligne.variable,
            contribution: ligne.contribution,
            libelle: typeof ligne.libelle === "string" ? ligne.libelle : ligne.variable,
          },
        ];
      })
    : [];
  return {
    factureId: String(corps.facture_id ?? ""),
    score: corps.score,
    classe: typeof corps.classe === "string" ? corps.classe : null,
    version: typeof corps.model_version === "string" ? corps.model_version : "",
    explications,
  };
}

function Saisie({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (valeur: string) => void;
  type?: string;
}) {
  return (
    <label>
      <Etiquette>{t(label)}</Etiquette>
      <Champ type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function texte(valeur: unknown, sinon: string) {
  return typeof valeur === "string" ? valeur : sinon;
}
