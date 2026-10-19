import { Erreur } from "@/components/domain/etats";
import { CompteForm } from "@/features/admin/compte-form";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/admin/utilisateurs");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.utilisateurs) ? recu.data.utilisateurs : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("admin.utilisateurs")}</h1>
      <ul className="divide-y divide-border text-sm">
        {lignes.map((ligne) => {
          const item = ligne as Record<string, unknown>;
          return (
            <li key={String(item.identifiant)} className="flex justify-between py-2">
              <span>{String(item.identifiant)}</span>
              <span>{t(`roles.${String(item.role)}`)}</span>
            </li>
          );
        })}
      </ul>
      <CompteForm />
    </>
  );
}
