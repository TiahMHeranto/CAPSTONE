import { Erreur } from "@/components/domain/etats";
import { Distribution } from "@/features/dashboard/distribution";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/bi");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const volumes = (recu.data.volumes ?? {}) as Record<string, number>;
  const distribution = Array.isArray(recu.data.distribution_scores) ? recu.data.distribution_scores : [];
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.pilotage")}</h1>
      <p className="text-sm text-muted">{t("admin.pilotageIntro")}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Carte titre={t("admin.volumes")} valeur={volumes.nb_factures} />
        <Carte titre={t("admin.alertesModele")} valeur={volumes.nb_alertes_modele} />
        <Carte titre={t("admin.decisions")} valeur={volumes.nb_decisions} />
        <Carte titre={t("admin.economise")} valeur={volumes.montant_economise} />
        <Carte titre={t("admin.detection")} valeur={volumes.taux_detection} />
      </div>
      <Distribution lignes={distribution as { tranche: string; nb: number }[]} />
    </>
  );
}

function Carte({ titre, valeur }: { titre: string; valeur: number }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm text-muted">{titre}</h2>
      <p className="mt-2 font-mono text-2xl tabular-nums">{valeur ?? "—"}</p>
    </section>
  );
}
