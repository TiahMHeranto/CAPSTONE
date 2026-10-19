import { Erreur, Vide } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, score } from "@/lib/format";

export default async function Page() {
  const recu = await appel("/bi");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.decisions) ? recu.data.decisions : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.decisions")}</h1>
      {lignes.length === 0 ? (
        <Vide />
      ) : (
        <ul className="divide-y divide-border text-sm">
          {lignes.map((ligne) => {
            const item = ligne as Record<string, unknown>;
            return (
              <li key={`${item.facture_id}-${item.created_at}`} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="font-mono">{String(item.facture_id)}</span>
                <span>{String(item.decision)}</span>
                <span className="tabular-nums">{typeof item.score === "number" ? score(item.score) : "—"}</span>
                <span>{dateCourte(String(item.created_at ?? ""))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
