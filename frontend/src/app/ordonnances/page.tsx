import { Erreur, Vide } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte } from "@/lib/format";

export default async function Page() {
  const recu = await appel("/me/ordonnances");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.ordonnances) ? recu.data.ordonnances : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.ordonnances")}</h1>
      {lignes.length === 0 ? (
        <Vide />
      ) : (
        <ul className="divide-y divide-border text-sm">
          {lignes.map((ligne) => {
            const item = ligne as Record<string, unknown>;
            return (
              <li key={String(item.ordonnance_id)} className="flex justify-between py-3 font-mono">
                <span>{String(item.ordonnance_id)}</span>
                <span>{dateCourte(String(item.date_prescription ?? ""))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
