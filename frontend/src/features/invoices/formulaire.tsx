"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Champ, Etiquette } from "@/components/ui";
import { envoyerFacture, lirePdf } from "@/features/invoices/api";
import { factureSchema, type FactureSaisie } from "@/features/invoices/schemas/facture";
import { messageErreur, t } from "@/i18n/traduire";

type Ligne = FactureSaisie["lignes"][number];

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

export function FormulaireFacture({ peutDeposer }: { peutDeposer: boolean }) {
  const router = useRouter();
  const [facture, setFacture] = useState<FactureSaisie>(vide);
  const [message, setMessage] = useState("");
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
    const recu = await envoyerFacture(lu.data, valider);
    setEnCours(false);
    if (recu.status === 200 && !valider) router.push(`/factures/${lu.data.facture_id}`);
    else setMessage(recu.status === 200 ? t("factures.valider") : messageErreur(recu.data));
  }

  return (
    <div className="space-y-4">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setEnCours(true);
          const recu = await lirePdf(new FormData(event.currentTarget));
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
        }}
      >
        <label>
          <Etiquette>{t("factures.pdf")}</Etiquette>
          <Champ name="fichier" type="file" accept="application/pdf" required />
        </label>
        <Button variante="secondary" disabled={enCours} type="submit">
          {t("factures.lire")}
        </Button>
      </form>
      <p className="text-sm text-muted">{t("factures.pdfAide")}</p>
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
