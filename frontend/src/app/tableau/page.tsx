import Link from "next/link";
import type { ReactNode } from "react";
import { Erreur } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant, score } from "@/lib/format";
import { lireSession } from "@/lib/session";
import type { Reponse, Role } from "@/lib/types";
import { redirect } from "next/navigation";

const PLAFOND_FACTURES = 50;
const PLAFOND_ORDONNANCES = 80;
const PLAFOND_REMBOURSEMENTS = 100;
const PLAFOND_ALERTES = 100;

export default async function Page() {
  const session = await lireSession();
  if (!session) redirect("/login");
  const profilRecu = await appel("/me/profil");
  if (profilRecu.status !== 200) return <Erreur texte={messageErreur(profilRecu.data)} />;
  const profil = profilRecu.data;
  const personnel = session.role === "assure" || session.role === "prestataire";
  const bureau = session.role === "gestionnaire" || session.role === "administrateur";
  const [factures, ordonnances, remboursements, bi, alertes, anomalies, supervision] = await Promise.all([
    personnel ? appel("/me/factures") : vide(),
    personnel ? appel("/me/ordonnances") : vide(),
    session.role === "assure" ? appel("/me/remboursements") : vide(),
    bureau ? appel("/bi") : vide(),
    bureau ? appel("/alerts") : vide(),
    bureau ? appel("/alerts/prescriptions") : vide(),
    session.role === "administrateur" ? appel("/admin/supervision") : vide(),
  ]);
  const contrat = objet(profil.contrat);
  const lignesFactures = liste(factures, "factures");
  const lignesOrdonnances = liste(ordonnances, "ordonnances");
  const lignesRemboursements = liste(remboursements, "remboursements");
  const lignesAlertes = liste(alertes, "alertes");
  const lignesAnomalies = liste(anomalies, "anomalies");
  const volumes = objet(bi?.data.volumes);
  const metriques = objet(supervision?.data.metriques);
  const latence = objet(metriques.latence_ms);
  const derive = objet(supervision?.data.derive);

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.tableau")}</h1>
      <p className="text-sm text-muted">{t(intro(session.role))}</p>
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-xl font-semibold">{t("nav.profil")}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Ligne libelle={t("tableau.nom")} valeur={libelleNom(profil)} />
          <Ligne libelle={t("role")} valeur={t(`roles.${session.role}`)} />
          <Ligne libelle={t("tableau.contrat")} valeur={texte(contrat.contrat_id)} />
          <Ligne libelle={t("tableau.formule")} valeur={texte(contrat.formule)} />
          <Ligne libelle={t("tableau.statut")} valeur={texte(contrat.statut ?? profil.statut)} />
          {session.role === "prestataire" ? (
            <>
              <Ligne libelle={t("tableau.type")} valeur={texte(profil.type)} />
              <Ligne libelle={t("tableau.ville")} valeur={texte(profil.ville)} />
            </>
          ) : null}
          {contrat.date_effet ? (
            <Ligne libelle={t("garanties.date_effet")} valeur={dateCourte(String(contrat.date_effet))} />
          ) : null}
          {contrat.date_fin ? (
            <Ligne libelle={t("garanties.date_fin")} valeur={dateCourte(String(contrat.date_fin))} />
          ) : null}
        </dl>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {personnel ? (
          <>
            <Indicateur
              href="/factures"
              titre={t("tableau.factures")}
              valeur={compter(lignesFactures, factures, PLAFOND_FACTURES)}
              plafond={lignesFactures.length >= PLAFOND_FACTURES}
            />
            <Indicateur
              href="/ordonnances"
              titre={t("tableau.ordonnances")}
              valeur={compter(lignesOrdonnances, ordonnances, PLAFOND_ORDONNANCES)}
              plafond={lignesOrdonnances.length >= PLAFOND_ORDONNANCES}
            />
          </>
        ) : null}
        {session.role === "assure" ? (
          <Indicateur
            href="/remboursements"
            titre={t("tableau.remboursements")}
            valeur={compter(lignesRemboursements, remboursements, PLAFOND_REMBOURSEMENTS)}
            plafond={lignesRemboursements.length >= PLAFOND_REMBOURSEMENTS}
          />
        ) : null}
        {bureau ? (
          <>
            <Indicateur href="/pilotage" titre={t("admin.volumes")} valeur={nombre(volumes.nb_factures, bi)} />
            <Indicateur
              href="/alertes"
              titre={t("tableau.alertes")}
              valeur={compter(lignesAlertes, alertes, PLAFOND_ALERTES)}
              plafond={lignesAlertes.length >= PLAFOND_ALERTES}
            />
            <Indicateur titre={t("tableau.anomalies")} valeur={compter(lignesAnomalies, anomalies, 100)} />
            <Indicateur href="/decisions" titre={t("admin.decisions")} valeur={nombre(volumes.nb_decisions, bi)} />
            <Indicateur href="/pilotage" titre={t("admin.economise")} valeur={argent(volumes.montant_economise, bi)} />
            <Indicateur href="/pilotage" titre={t("admin.detection")} valeur={taux(volumes.taux_detection, bi)} />
          </>
        ) : null}
        {session.role === "administrateur" && supervision?.status === 200 ? (
          <>
            <Indicateur href="/supervision" titre={t("admin.volume")} valeur={texte(metriques.volume)} />
            <Indicateur href="/supervision" titre={t("admin.erreurs")} valeur={texte(metriques.erreurs)} />
            <Indicateur
              href="/supervision"
              titre={t("admin.latence")}
              valeur={`${texte(latence.p50)} / ${texte(latence.p95)}`}
            />
            <Indicateur href="/supervision" titre={t("tableau.derive")} valeur={texte(derive.etat)} />
          </>
        ) : null}
      </div>
      {personnel && lignesFactures.length > 0 ? (
        <Liste titre={t("tableau.recentes")}>
          {lignesFactures.slice(0, 5).map((item) => {
            const id = String(item.facture_id ?? "");
            return (
              <li key={id} className="flex flex-wrap justify-between gap-2 py-3">
                <Link className="font-mono" href={`/factures/${id}`}>
                  {id}
                </Link>
                <span className="text-sm text-muted">
                  {dateCourte(String(item.date_soin ?? ""))} · {montant(Number(item.montant_total ?? 0), "")}
                </span>
              </li>
            );
          })}
        </Liste>
      ) : null}
      {personnel && lignesOrdonnances.length > 0 ? (
        <Liste titre={t("tableau.recentesOrd")}>
          {lignesOrdonnances.slice(0, 5).map((item) => (
            <li key={String(item.ordonnance_id)} className="flex justify-between py-3 font-mono">
              <span>{String(item.ordonnance_id)}</span>
              <span>{dateCourte(String(item.date_prescription ?? ""))}</span>
            </li>
          ))}
        </Liste>
      ) : null}
      {bureau && lignesAlertes.length > 0 ? (
        <Liste titre={t("tableau.recentesAlertes")}>
          {lignesAlertes.slice(0, 5).map((item) => {
            const id = String(item.facture_id ?? "");
            return (
              <li key={id} className="flex justify-between py-3">
                <Link className="font-mono" href={`/factures/${id}`}>
                  {id}
                </Link>
                <span className="tabular-nums">{score(Number(item.score ?? 0))}</span>
              </li>
            );
          })}
        </Liste>
      ) : null}
    </>
  );
}

function intro(role: Role): string {
  if (role === "assure") return "tableau.introAssure";
  if (role === "prestataire") return "tableau.introPrestataire";
  if (role === "gestionnaire") return "tableau.introGestion";
  return "tableau.introAdmin";
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div>
      <dt className="text-muted">{libelle}</dt>
      <dd>{valeur}</dd>
    </div>
  );
}

function Indicateur({
  href,
  titre,
  valeur,
  plafond = false,
}: {
  href?: string;
  titre: string;
  valeur: string;
  plafond?: boolean;
}) {
  const corps = (
    <>
      <h2 className="text-sm text-muted">{titre}</h2>
      <p className="mt-2 font-mono text-2xl tabular-nums">{valeur}</p>
      {plafond ? <p className="mt-1 text-xs text-muted">{t("tableau.plafond")}</p> : null}
    </>
  );
  if (!href) return <section className="rounded-lg border border-border bg-surface p-4">{corps}</section>;
  return (
    <Link className="rounded-lg border border-border bg-surface p-4" href={href}>
      {corps}
    </Link>
  );
}

function Liste({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold">{titre}</h2>
      <ul className="divide-y divide-border text-sm">{children}</ul>
    </section>
  );
}

function libelleNom(profil: Record<string, unknown>): string {
  const nom = profil.nom;
  if (typeof nom === "string" && nom.trim()) return nom.trim();
  if (nom && typeof nom === "object") {
    const fiche = nom as Record<string, unknown>;
    const complet = [fiche.prenoms, fiche.nom].filter((part) => typeof part === "string" && part).join(" ");
    if (complet) return complet;
  }
  return "—";
}

function compter(lignes: Record<string, unknown>[], recu: Reponse | null, plafond: number): string {
  if (!recu || recu.status !== 200) return "—";
  if (lignes.length >= plafond) return `${lignes.length}+`;
  return String(lignes.length);
}

function nombre(valeur: unknown, recu: Reponse | null): string {
  if (!recu || recu.status !== 200 || typeof valeur !== "number") return "—";
  return new Intl.NumberFormat("fr-FR").format(valeur);
}

function argent(valeur: unknown, recu: Reponse | null): string {
  if (!recu || recu.status !== 200 || typeof valeur !== "number") return "—";
  return montant(valeur, "MGA");
}

function taux(valeur: unknown, recu: Reponse | null): string {
  if (!recu || recu.status !== 200 || typeof valeur !== "number") return "—";
  const ratio = valeur <= 1 ? valeur : valeur / 100;
  return new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}

function liste(recu: Reponse | null, cle: string): Record<string, unknown>[] {
  if (!recu || recu.status !== 200 || !Array.isArray(recu.data[cle])) return [];
  return recu.data[cle] as Record<string, unknown>[];
}

function objet(valeur: unknown): Record<string, unknown> {
  return valeur && typeof valeur === "object" ? (valeur as Record<string, unknown>) : {};
}

function texte(valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  return String(valeur);
}

function vide(): Promise<Reponse | null> {
  return Promise.resolve(null);
}
