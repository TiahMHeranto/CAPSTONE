import Link from "next/link";
import { Vide, Erreur } from "@/components/domain/etats";
import { RiskBadge } from "@/components/domain/risk-badge";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant, score } from "@/lib/format";

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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-normal">{t("factures.identifiant")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.soin")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.type")}</th>
                <th className="px-3 py-2 text-right font-normal">{t("factures.montant")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.statut")}</th>
                <th className="px-3 py-2 font-normal">{t("alerte.score")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.niveau")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.ouvrir")}</th>
              </tr>
            </thead>
            <tbody>
              {alertes.map((ligne) => {
                const item = ligne as Record<string, unknown>;
                const id = String(item.facture_id ?? "");
                const valeur = Number(item.score ?? 0);
                const classe = typeof item.classe === "string" ? item.classe : "alerte";
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="px-3 py-3 font-mono">{id}</td>
                    <td className="px-3 py-3">{dateCourte(String(item.date_soin ?? item.created_at ?? ""))}</td>
                    <td className="px-3 py-3">{texte(item.type_facture)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {item.montant_total === null || item.montant_total === undefined
                        ? "—"
                        : montant(Number(item.montant_total), String(item.devise ?? ""))}
                    </td>
                    <td className="px-3 py-3">{libelle("factures.statuts", item.statut)}</td>
                    <td className="px-3 py-3 tabular-nums">{score(valeur)}</td>
                    <td className="px-3 py-3">
                      <RiskBadge valeur={valeur} classe={classe} />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/alertes/${id}`}>{t("factures.ouvrir")}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function texte(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  return String(valeur);
}

function libelle(prefixe: string, valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  const cle = `${prefixe}.${String(valeur)}`;
  const traduit = t(cle);
  return traduit === cle ? String(valeur) : traduit;
}
