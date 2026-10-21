import { Erreur, Vide } from "@/components/domain/etats";
import { RiskBadge } from "@/components/domain/risk-badge";
import { FormulaireFacture } from "@/features/invoices/formulaire";
import { t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant, score } from "@/lib/format";
import { bureau } from "@/lib/rbac";
import { lireSession } from "@/lib/session";
import Link from "next/link";

export default async function Page() {
  const session = await lireSession();
  const role = session?.role;
  const peutDeposer = role === "prestataire" || role === "gestionnaire";
  const dossier = role === "prestataire" || role === "assure" ? await appel("/me/factures") : null;
  const registre = role && bureau(role) ? await appel("/invoices") : null;
  const factures = Array.isArray(dossier?.data.factures) ? dossier.data.factures : [];
  const toutes = Array.isArray(registre?.data.factures) ? registre.data.factures : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("factures.titre")}</h1>
      <p className="text-sm text-muted">{t("factures.intro")}</p>
      {role === "assure" ? null : (
        <FormulaireFacture peutDeposer={peutDeposer} peutCreerOrdonnance={role === "prestataire"} />
      )}
      {dossier && dossier.status !== 200 ? <Erreur texte={t("erreurs.generique")} /> : null}
      {registre && registre.status !== 200 ? <Erreur texte={t("erreurs.generique")} /> : null}
      {registre && registre.status === 200 ? (
        <section className="overflow-x-auto">
          <h2 className="mb-1 text-xl">{t("factures.liste")}</h2>
          <p className="mb-3 text-sm text-muted">{t("factures.listeIntro")}</p>
          {toutes.length === 0 ? (
            <Vide texte={t("factures.aucune")} />
          ) : (
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
                  <th className="px-3 py-2 font-normal">{t("factures.decision")}</th>
                </tr>
              </thead>
              <tbody>
                {toutes.map((ligne) => {
                  const item = ligne as Record<string, unknown>;
                  const id = String(item.facture_id ?? "");
                  const valeur = typeof item.score === "number" ? item.score : null;
                  const classe = typeof item.classe === "string" ? item.classe : null;
                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <Link className="font-mono" href={`/factures/${id}`}>
                          {id}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{dateCourte(String(item.date_soin ?? ""))}</td>
                      <td className="px-3 py-3">{texte(item.type_facture)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {montant(Number(item.montant_total ?? 0), String(item.devise ?? ""))}
                      </td>
                      <td className="px-3 py-3">{libelle("factures.statuts", item.statut)}</td>
                      <td className="px-3 py-3 tabular-nums">{valeur === null ? "—" : score(valeur)}</td>
                      <td className="px-3 py-3">
                        {valeur === null ? t("factures.sansScore") : <RiskBadge valeur={valeur} classe={classe} />}
                      </td>
                      <td className="px-3 py-3">{libelle("factures.decisions", item.decision, "factures.sansDecision")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
      {dossier && dossier.status === 200 ? (
        <section>
          <h2 className="mb-2 text-xl">{t("factures.dossier")}</h2>
          {factures.length === 0 ? (
            <Vide texte={t("factures.aucune")} />
          ) : (
            <ul className="divide-y divide-border">
              {factures.map((ligne) => {
                const item = ligne as Record<string, unknown>;
                const id = String(item.facture_id ?? "");
                return (
                  <li key={id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                    <Link className="font-mono" href={`/factures/${id}`}>
                      {id}
                    </Link>
                    <span className="tabular-nums">{montant(Number(item.montant_total ?? 0), String(item.devise ?? ""))}</span>
                    <span>{dateCourte(String(item.date_soin ?? ""))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </>
  );
}

function texte(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  return String(valeur);
}

function libelle(prefixe: string, valeur: unknown, vide = ""): string {
  if (valeur === null || valeur === undefined || valeur === "") return vide ? t(vide) : "—";
  const cle = `${prefixe}.${String(valeur)}`;
  const traduit = t(cle);
  return traduit === cle ? String(valeur) : traduit;
}
