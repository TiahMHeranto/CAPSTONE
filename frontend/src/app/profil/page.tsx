import { Erreur } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/me/profil");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.profil")}</h1>
      <p>
        {t(`roles.${String(recu.data.role ?? "")}`)} · {String(recu.data.identifiant ?? "")}
      </p>
    </>
  );
}
