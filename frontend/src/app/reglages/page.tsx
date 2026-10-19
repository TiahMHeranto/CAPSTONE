import { Erreur } from "@/components/domain/etats";
import { ReglagesForm } from "@/features/admin/reglages-form";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/admin/settings");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const corpus = await appel("/admin/assistant/corpus");
  const canaux = Array.isArray(recu.data.notification_channels) ? recu.data.notification_channels.join(", ") : "";
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.reglages")}</h1>
      <ReglagesForm
        seuil={Number(recu.data.alert_threshold ?? 0)}
        canaux={canaux}
        version={String(recu.data.active_model_version ?? "")}
        derive={Number(recu.data.drift_psi_threshold ?? 0)}
        webhook={String(recu.data.n8n_webhook_url ?? "")}
        corpus={String(recu.data.rag_corpus_path ?? "/corpus")}
        statutCorpus={corpus.status === 200 ? String(corpus.data.statut ?? "repos") : "repos"}
      />
    </>
  );
}
