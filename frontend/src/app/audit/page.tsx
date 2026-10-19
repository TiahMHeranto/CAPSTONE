import { Erreur, Vide } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/alerts/journal");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.alertes) ? recu.data.alertes : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("admin.journal")}</h1>
      {lignes.length === 0 ? (
        <Vide />
      ) : (
        <ul className="divide-y divide-border text-sm">
          {lignes.map((ligne, index) => {
            const item = ligne as Record<string, unknown>;
            return (
              <li key={index} className="flex justify-between py-2">
                <span className="font-mono">{String(item.facture_id ?? "")}</span>
                <span>
                  {String(item.canal ?? "")} · {String(item.statut ?? "")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
