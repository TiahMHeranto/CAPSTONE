import { Erreur } from "@/components/domain/etats";
import { MotDePasseForm } from "@/features/auth/mot-de-passe";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte } from "@/lib/format";

function Ligne({ libelle, valeur }: { libelle: string; valeur: unknown }) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted">{libelle}</dt>
      <dd className="text-right">{String(valeur)}</dd>
    </div>
  );
}

function nomComplet(valeur: unknown): string {
  if (!valeur || typeof valeur !== "object") return "";
  const fiche = valeur as { prenoms?: string; nom?: string };
  return [fiche.prenoms, fiche.nom].filter(Boolean).join(" ");
}

export default async function Page() {
  const recu = await appel("/me/profil");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const data = recu.data;
  const contrat = data.contrat && typeof data.contrat === "object" ? (data.contrat as Record<string, unknown>) : null;
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.profil")}</h1>
      <p className="text-muted">{t(`roles.${String(data.role ?? "")}`)}</p>
      {data.motif ? <p>{String(data.motif)}</p> : null}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-xl font-semibold">{t("profil.compte")}</h2>
        <dl>
          <Ligne libelle={t("login.identifiantCompte")} valeur={data.identifiant} />
          <Ligne libelle={t("admin.email")} valeur={data.email} />
          <Ligne libelle={t("profil.creeLe")} valeur={dateCourte(String(data.created_at ?? ""))} />
          <Ligne libelle={t("profil.etat")} valeur={data.actif === false ? t("profil.inactif") : t("profil.actif")} />
        </dl>
        <MotDePasseForm />
      </section>
      {data.lien || data.nom || data.ville ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-xl font-semibold">{t("profil.personne")}</h2>
          <dl>
            <Ligne libelle={t("profil.nom")} valeur={typeof data.nom === "object" ? nomComplet(data.nom) : data.nom} />
            <Ligne libelle={t("profil.reference")} valeur={data.lien} />
            <Ligne libelle={t("profil.rang")} valeur={data.rang} />
            <Ligne libelle={t("profil.sexe")} valeur={data.sexe} />
            <Ligne libelle={t("profil.ville")} valeur={data.ville} />
            <Ligne libelle={t("profil.type")} valeur={data.type} />
            <Ligne libelle={t("profil.statut")} valeur={data.statut} />
            <Ligne libelle={t("profil.adhesion")} valeur={data.date_adhesion ? dateCourte(String(data.date_adhesion)) : ""} />
            <Ligne libelle={t("profil.radiation")} valeur={data.date_radiation ? dateCourte(String(data.date_radiation)) : ""} />
            <Ligne libelle={t("profil.titulaire")} valeur={nomComplet(data.assure_principal)} />
          </dl>
        </section>
      ) : null}
      {contrat ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-xl font-semibold">{t("profil.contrat")}</h2>
          <dl>
            <Ligne libelle={t("profil.reference")} valeur={contrat.contrat_id} />
            <Ligne libelle={t("profil.formule")} valeur={contrat.formule} />
            <Ligne libelle={t("profil.statut")} valeur={contrat.statut} />
            <Ligne libelle={t("profil.effet")} valeur={contrat.date_effet ? dateCourte(String(contrat.date_effet)) : ""} />
            <Ligne libelle={t("profil.fin")} valeur={contrat.date_fin ? dateCourte(String(contrat.date_fin)) : ""} />
          </dl>
        </section>
      ) : null}
    </>
  );
}
