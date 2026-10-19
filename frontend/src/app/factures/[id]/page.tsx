import Link from "next/link";
import { Erreur } from "@/components/domain/etats";
import { RiskBadge } from "@/components/domain/risk-badge";
import { ScoreRing } from "@/components/domain/score-ring";
import { ShapChart, type Explication } from "@/components/domain/shap-chart";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant } from "@/lib/format";
import { DecisionForm } from "@/features/alerts/decision";
import { lireSession } from "@/lib/session";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await lireSession();
  const facture = await appel(`/invoices/${id}`);
  if (facture.status !== 200) return <Erreur texte={messageErreur(facture.data)} />;
  const data = facture.data;
  const scoreValeur = typeof data.score === "number" ? data.score : null;
  const prediction = session?.role === "gestionnaire" || session?.role === "administrateur" ? await appel(`/predictions/${id}`) : null;
  const lignes = Array.isArray(prediction?.data.explications) ? (prediction.data.explications as Explication[]) : [];
  const devise = String(data.devise ?? "");
  return (
    <>
      <p className="text-sm">
        <Link href="/factures">{t("factures.titre")}</Link>
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-mono text-2xl">{String(data.facture_id)}</h1>
        {scoreValeur !== null ? (
          <>
            <ScoreRing valeur={scoreValeur} classe={typeof data.classe === "string" ? data.classe : null} />
            <RiskBadge valeur={scoreValeur} classe={typeof data.classe === "string" ? data.classe : null} />
          </>
        ) : null}
      </div>
      <p>
        {dateCourte(String(data.date_soin ?? ""))} · {montant(Number(data.montant_total ?? 0), devise)}
      </p>
      {lignes.length ? (
        <section>
          <h2 className="mb-2 text-xl">{t("factures.pourquoiScore")}</h2>
          <ShapChart lignes={lignes} />
        </section>
      ) : null}
      {session?.role === "gestionnaire" ? <DecisionForm factureId={id} /> : null}
    </>
  );
}
