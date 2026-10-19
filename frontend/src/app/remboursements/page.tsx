import Link from "next/link";
import { Erreur, Vide } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant } from "@/lib/format";

export default async function Page() {
  const recu = await appel("/me/remboursements");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.remboursements) ? recu.data.remboursements : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.remboursements")}</h1>
      {lignes.length === 0 ? (
        <Vide />
      ) : (
        <ol className="space-y-3">
          {lignes.map((ligne) => {
            const item = ligne as Record<string, unknown>;
            const id = String(item.facture_id ?? "");
            return (
              <li key={id} className="rounded-lg border border-border p-3">
                <Link className="font-mono" href={`/factures/${id}`}>
                  {id}
                </Link>
                <p className="text-sm text-muted">
                  {dateCourte(String(item.date_soin ?? ""))} · {String(item.statut ?? "")} ·{" "}
                  {montant(Number(item.montant_total ?? 0), "")}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
