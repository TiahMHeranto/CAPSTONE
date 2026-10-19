import Link from "next/link";
import { Vide, Erreur } from "@/components/domain/etats";
import { RiskBadge } from "@/components/domain/risk-badge";
import { ScoreRing } from "@/components/domain/score-ring";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { score } from "@/lib/format";

export default async function Page() {
  const recu = await appel("/alerts");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const alertes = Array.isArray(recu.data.alertes) ? recu.data.alertes : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("alerte.titre")}</h1>
      <p className="text-sm text-muted">{t("alerte.intro")}</p>
      {alertes.length === 0 ? (
        <Vide texte={t("alerte.vide")} />
      ) : (
        <ul className="divide-y divide-border">
          {alertes.map((ligne) => {
            const item = ligne as Record<string, unknown>;
            const id = String(item.facture_id ?? "");
            const valeur = Number(item.score ?? 0);
            return (
              <li key={id}>
                <Link className="flex flex-wrap items-center gap-4 py-3" href={`/alertes/${id}`}>
                  <ScoreRing valeur={valeur} classe="alerte" />
                  <span className="font-mono">{id}</span>
                  <RiskBadge valeur={valeur} classe="alerte" />
                  <span className="tabular-nums">{score(valeur)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
