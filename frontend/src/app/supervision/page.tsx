import { Erreur } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";

export default async function Page() {
  const recu = await appel("/admin/supervision");
  if (recu.status !== 200) return <Erreur texte={messageErreur(recu.data)} />;
  const metriques = (recu.data.metriques ?? {}) as Record<string, unknown>;
  const latence = (metriques.latence_ms ?? {}) as Record<string, number>;
  const derive = (recu.data.derive ?? {}) as Record<string, unknown>;
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("admin.supervision")}</h1>
      <div className="grid gap-3 md:grid-cols-3">
        <Carte titre={t("admin.volume")} valeur={String(metriques.volume ?? "—")} />
        <Carte titre={t("admin.erreurs")} valeur={String(metriques.erreurs ?? "—")} />
        <Carte titre={t("admin.latence")} valeur={`${latence.p50 ?? "—"} / ${latence.p95 ?? "—"}`} />
      </div>
      <p className="text-sm">
        {String(derive.etat ?? "—")} · PSI {String(derive.psi ?? "—")} · {String(derive.model_version ?? "")}
      </p>
    </>
  );
}

function Carte({ titre, valeur }: { titre: string; valeur: string }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm text-muted">{titre}</h2>
      <p className="mt-2 font-mono text-2xl tabular-nums">{valeur}</p>
    </section>
  );
}
