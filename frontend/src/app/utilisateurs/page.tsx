import { Erreur } from "@/components/domain/etats";
import { CompteForm } from "@/features/admin/compte-form";
import { SupprimerCompte } from "@/features/admin/supprimer-compte";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte } from "@/lib/format";

export default async function Page() {
  const recu = await appel("/admin/utilisateurs");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const lignes = Array.isArray(recu.data.utilisateurs) ? recu.data.utilisateurs : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("admin.utilisateurs")}</h1>
      <CompteForm />
      <ul className="mt-8 divide-y divide-border text-sm">
        {lignes.map((ligne) => {
          const item = ligne as Record<string, unknown>;
          const id = String(item.identifiant ?? "");
          const personne = String(item.assure_id || item.prestataire_id || "");
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-medium">{id}</span>
                <span className="text-muted">{String(item.email ?? "")}</span>
                {personne ? <span className="block text-muted">{personne}</span> : null}
              </span>
              <span className="text-muted">{t(`roles.${String(item.role)}`)}</span>
              <span className="text-muted">{dateCourte(String(item.created_at ?? ""))}</span>
              <SupprimerCompte identifiant={id} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
