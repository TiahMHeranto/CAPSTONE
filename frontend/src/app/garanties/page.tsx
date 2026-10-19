import { Erreur } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/me/contrat");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const brut = recu.data.contrat;
  const contrat = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.garanties")}</h1>
      <dl className="grid gap-2 text-sm">
        {["formule", "statut", "date_effet", "date_fin", "contrat_id"].map((cle) => (
          <div key={cle} className="grid grid-cols-2 gap-2 border-b border-border py-2">
            <dt className="text-muted">{t(`garanties.${cle}`)}</dt>
            <dd>{String(contrat[cle] ?? "—")}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
