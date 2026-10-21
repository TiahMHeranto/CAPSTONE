import Link from "next/link";
import { Erreur, Vide } from "@/components/domain/etats";
import { motifTexte } from "@/features/alerts/motifs";
import { t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant } from "@/lib/format";
import { bureau } from "@/lib/rbac";
import { lireSession } from "@/lib/session";

export default async function Page() {
  const session = await lireSession();
  const role = session?.role ?? "assure";
  const gestion = bureau(role);
  const recu = await appel(gestion ? "/remboursements" : "/me/remboursements");
  if (recu.status !== 200) return <Erreur />;
  const lignes = Array.isArray(recu.data.remboursements) ? recu.data.remboursements : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.remboursements")}</h1>
      <p className="text-sm text-muted">{gestion ? t("remboursements.introBureau") : t("remboursements.intro")}</p>
      {lignes.length === 0 ? (
        <Vide texte={t("remboursements.vide")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-normal">{t("factures.identifiant")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.soin")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.type")}</th>
                <th className="px-3 py-2 text-right font-normal">{t("factures.montant")}</th>
                <th className="px-3 py-2 text-right font-normal">{t("remboursements.pris")}</th>
                <th className="px-3 py-2 text-right font-normal">{t("remboursements.reste")}</th>
                <th className="px-3 py-2 font-normal">{t("factures.statut")}</th>
                <th className="px-3 py-2 font-normal">{t("alerte.motif")}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => {
                const item = ligne as Record<string, unknown>;
                const id = String(item.facture_id ?? "");
                const devise = String(item.devise ?? "MGA");
                return (
                  <tr key={id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <Link className="font-mono" href={`/factures/${id}`}>
                        {id}
                      </Link>
                    </td>
                    <td className="px-3 py-3">{dateCourte(String(item.date_soin ?? ""))}</td>
                    <td className="px-3 py-3">{texte(item.type_facture)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{argent(item.montant_total, devise)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{argent(item.montant_pris_en_charge, devise)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{argent(item.reste_a_charge, devise)}</td>
                    <td className="px-3 py-3">{libelle(item.statut)}</td>
                    <td className="px-3 py-3">{item.motif_rejet ? motifTexte(String(item.motif_rejet), t) : "—"}</td>
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

function argent(valeur: unknown, devise: string): string {
  return typeof valeur === "number" ? montant(valeur, devise) : "—";
}

function texte(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  return String(valeur);
}

function libelle(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  const cle = `factures.statuts.${String(valeur)}`;
  const traduit = t(cle);
  return traduit === cle ? String(valeur) : traduit;
}
