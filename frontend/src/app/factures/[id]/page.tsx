import Link from "next/link";
import { Erreur } from "@/components/domain/etats";
import { RiskBadge } from "@/components/domain/risk-badge";
import { ScoreRing } from "@/components/domain/score-ring";
import { ShapChart, type Explication } from "@/components/domain/shap-chart";
import { Confirmation, DecisionForm } from "@/features/alerts/decision";
import { motifTexte } from "@/features/alerts/motifs";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant, score } from "@/lib/format";
import { bureau } from "@/lib/rbac";
import { lireSession } from "@/lib/session";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await lireSession();
  const facture = await appel(`/invoices/${id}`);
  if (facture.status !== 200) return <Erreur texte={messageErreur(facture.data)} />;
  const data = facture.data;
  const scoreValeur = typeof data.score === "number" ? data.score : null;
  const classe = typeof data.classe === "string" ? data.classe : null;
  const enAlerte = classe === "alerte";
  const decide = bureau(session?.role ?? "assure");
  const prediction = decide ? await appel(`/predictions/${id}`) : null;
  const lignesScore = Array.isArray(prediction?.data.explications) ? (prediction.data.explications as Explication[]) : [];
  const lignes = Array.isArray(data.lignes) ? (data.lignes as Record<string, unknown>[]) : [];
  const anomalies = Array.isArray(data.anomalies_prescription)
    ? (data.anomalies_prescription as Record<string, unknown>[])
    : [];
  const decision =
    data.decision && typeof data.decision === "object" ? (data.decision as Record<string, unknown>) : null;
  const devise = String(data.devise ?? "");
  const retour = enAlerte ? "/alertes" : "/factures";
  return (
    <>
      <p className="text-sm">
        <Link href={retour}>{enAlerte ? t("alerte.titre") : t("factures.titre")}</Link>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-mono text-2xl">{String(data.facture_id)}</h1>
        {scoreValeur !== null ? (
          <>
            <ScoreRing valeur={scoreValeur} classe={classe} />
            <RiskBadge valeur={scoreValeur} classe={classe} />
            <span className="tabular-nums">{score(scoreValeur)}</span>
          </>
        ) : null}
        <span className="rounded-md border border-border px-2 py-1 text-sm">{libelle("factures.statuts", data.statut)}</span>
      </div>
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-xl">{t("factures.titre")}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Ligne libelle={t("factures.type")} valeur={texte(data.type_facture)} />
          <Ligne libelle={t("factures.soin")} valeur={dateCourte(String(data.date_soin ?? ""))} />
          <Ligne libelle={t("factures.emission")} valeur={dateCourte(String(data.date_facture ?? ""))} />
          <Ligne libelle={t("factures.montant")} valeur={montant(Number(data.montant_total ?? 0), devise)} />
          <Ligne libelle={t("remboursements.pris")} valeur={argent(data.montant_pris_en_charge, devise)} />
          <Ligne libelle={t("remboursements.reste")} valeur={argent(data.reste_a_charge, devise)} />
          <Ligne libelle={t("factures.statut")} valeur={libelle("factures.statuts", data.statut)} />
          <Ligne libelle={t("factures.niveau")} valeur={scoreValeur === null ? t("factures.sansScore") : ""} badge={scoreValeur} classe={classe} />
          <Ligne libelle={t("factures.assure")} valeur={texte(data.assure_id)} />
          <Ligne libelle={t("factures.prestataire")} valeur={texte(data.prestataire_id)} />
          <Ligne libelle={t("factures.contrat")} valeur={texte(data.contrat_id)} />
          <Ligne libelle={t("factures.ordonnance")} valeur={texte(data.ordonnance_id)} />
          <Ligne libelle={t("factures.version")} valeur={texte(data.model_version)} />
          <Ligne
            libelle={t("alerte.decisionActuelle")}
            valeur={
              decision
                ? `${libelle("factures.decisions", decision.decision)}${decision.motif ? ` — ${motifTexte(String(decision.motif), t)}` : ""}`
                : t("factures.sansDecision")
            }
          />
        </dl>
      </section>
      <section>
        <h2 className="mb-2 text-xl">{t("factures.lignes")}</h2>
        {lignes.length === 0 ? (
          <p className="text-sm text-muted">{t("factures.aucuneLigne")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-normal">{t("factures.code")}</th>
                  <th className="px-3 py-2 font-normal">{t("factures.typeLigne")}</th>
                  <th className="px-3 py-2 text-right font-normal">{t("factures.quantite")}</th>
                  <th className="px-3 py-2 text-right font-normal">{t("factures.prix")}</th>
                  <th className="px-3 py-2 text-right font-normal">{t("factures.montantLigne")}</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, index) => (
                  <tr key={`${String(ligne.code)}-${index}`} className="border-t border-border">
                    <td className="px-3 py-3 font-mono">{texte(ligne.code)}</td>
                    <td className="px-3 py-3">{texte(ligne.type_ligne)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{texte(ligne.quantite)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{montant(Number(ligne.prix_unitaire ?? 0), devise)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{montant(Number(ligne.montant ?? 0), devise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {anomalies.length ? (
        <section>
          <h2 className="mb-2 text-xl">{t("factures.anomalies")}</h2>
          <ul className="space-y-2 text-sm">
            {anomalies.map((item, index) => (
              <li key={`${String(item.code)}-${index}`} className="rounded-lg border border-border px-3 py-2">
                <span className="font-mono">{texte(item.code)}</span>
                {item.motif ? <span> — {String(item.motif)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {lignesScore.length ? (
        <section>
          <h2 className="mb-2 text-xl">{t("factures.pourquoiScore")}</h2>
          <ShapChart lignes={lignesScore} />
        </section>
      ) : null}
      {decision && (decision.decision === "valider" || decision.decision === "rejeter") ? (
        <Confirmation
          decision={String(decision.decision)}
          motif={decision.motif ? String(decision.motif) : undefined}
          pris={typeof data.montant_pris_en_charge === "number" ? data.montant_pris_en_charge : null}
          reste={typeof data.reste_a_charge === "number" ? data.reste_a_charge : null}
          devise={devise}
        />
      ) : decide ? (
        <DecisionForm factureId={id} enAlerte={enAlerte} devise={devise} />
      ) : null}
    </>
  );
}

function Ligne({
  libelle,
  valeur,
  badge = null,
  classe = null,
}: {
  libelle: string;
  valeur: string;
  badge?: number | null;
  classe?: string | null;
}) {
  return (
    <div>
      <dt className="text-muted">{libelle}</dt>
      <dd>{badge === null ? valeur : <RiskBadge valeur={badge} classe={classe} />}</dd>
    </div>
  );
}

function texte(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  return String(valeur);
}

function argent(valeur: unknown, devise: string): string {
  return typeof valeur === "number" ? montant(valeur, devise) : "—";
}

function libelle(prefixe: string, valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  const cle = `${prefixe}.${String(valeur)}`;
  const traduit = t(cle);
  return traduit === cle ? String(valeur) : traduit;
}
