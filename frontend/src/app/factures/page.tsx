import { Erreur, Vide } from "@/components/domain/etats";
import { FormulaireFacture } from "@/features/invoices/formulaire";
import { t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant } from "@/lib/format";
import { lireSession } from "@/lib/session";
import Link from "next/link";

export default async function Page() {
  const session = await lireSession();
  const role = session?.role;
  const peutDeposer = role === "prestataire" || role === "gestionnaire";
  const dossier = role === "prestataire" || role === "assure" ? await appel("/me/factures") : null;
  const factures = Array.isArray(dossier?.data.factures) ? dossier.data.factures : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("factures.titre")}</h1>
      <p className="text-sm text-muted">{t("factures.intro")}</p>
      {role === "assure" ? null : (
        <FormulaireFacture peutDeposer={peutDeposer} peutCreerOrdonnance={role === "prestataire"} />
      )}
      {dossier && dossier.status !== 200 ? <Erreur texte={t("erreurs.generique")} /> : null}
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
