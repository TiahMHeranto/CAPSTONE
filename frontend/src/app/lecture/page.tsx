import { Erreur, Vide } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/read");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.relations) ? recu.data.relations : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.lecture")}</h1>
      {lignes.length === 0 ? (
        <Vide />
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {lignes.map((ligne) => {
              const item = ligne as Record<string, unknown>;
              const cle = `${item.schema}.${item.nom}`;
              return (
                <tr key={cle} className="border-b border-border">
                  <th className="py-2 text-left font-mono font-normal" scope="row">
                    {cle}
                  </th>
                  <td className="py-2 text-right tabular-nums">{String(item.nb ?? "")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
