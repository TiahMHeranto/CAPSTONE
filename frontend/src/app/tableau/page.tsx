import Link from "next/link";
import type { ReactNode } from "react";
import { CarteAssistant } from "@/components/carte-assistant";
import { Erreur } from "@/components/domain/etats";
import { messageErreur, t } from "@/i18n/traduire";
import { appel } from "@/lib/api/serveur";
import { dateCourte, montant, score } from "@/lib/format";
import { nomAffiche, prenomAffiche } from "@/lib/nom";
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

  if (session.role === "assure") {
    return (
      <VueAssure
        nom={nomAffiche(profil)}
        prenom={prenomAffiche(profil)}
        contrat={contrat}
        factures={lignesFactures}
        ordonnances={lignesOrdonnances}
        compteFactures={compter(lignesFactures, factures, PLAFOND_FACTURES)}
        compteOrdonnances={compter(lignesOrdonnances, ordonnances, PLAFOND_ORDONNANCES)}
        compteRemboursements={compter(lignesRemboursements, remboursements, PLAFOND_REMBOURSEMENTS)}
        aucunRemboursement={remboursements?.status === 200 && lignesRemboursements.length === 0}
      />
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.tableau")}</h1>
      <p className="text-sm text-muted">{t(intro(session.role))}</p>
      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-xl font-semibold">{t("nav.profil")}</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Ligne libelle={t("tableau.nom")} valeur={nomAffiche(profil) || "—"} />
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

function dateLongue(valeur: string): string {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur.slice(0, 10);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function VueAssure({
  nom,
  prenom,
  contrat,
  factures,
  ordonnances,
  compteFactures,
  compteOrdonnances,
  compteRemboursements,
  aucunRemboursement,
}: {
  nom: string;
  prenom: string;
  contrat: Record<string, unknown>;
  factures: Record<string, unknown>[];
  ordonnances: Record<string, unknown>[];
  compteFactures: string;
  compteOrdonnances: string;
  compteRemboursements: string;
  aucunRemboursement: boolean;
}) {
  const formule = texte(contrat.formule);
  const actif = String(contrat.statut ?? "").toLowerCase() === "actif";
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
      <div className="space-y-4">
        <header>
          <h1 className="text-3xl font-semibold">{prenom ? `${t("tableau.bonjour")}, ${prenom}` : t("tableau.bonjour")}</h1>
          <p className="mt-1 text-sm text-muted">{t("tableau.introAssure")}</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          <Compteur href="/factures" icone="facture" titre={t("tableau.factures")} valeur={compteFactures} lien={t("tableau.voirFactures")} />
          <Compteur href="/ordonnances" icone="ordonnance" titre={t("tableau.ordonnances")} valeur={compteOrdonnances} lien={t("tableau.voirOrdonnances")} />
          <Compteur
            href="/remboursements"
            icone="remboursement"
            titre={t("tableau.remboursements")}
            valeur={compteRemboursements}
            lien={aucunRemboursement ? "" : t("tableau.voirRemboursements")}
            note={aucunRemboursement ? t("tableau.aucunRemboursement") : ""}
          />
        </div>
        <Tableau
          titre={t("tableau.recentes")}
          href="/factures"
          compte={compteFactures}
          colonnes={[t("tableau.reference"), t("tableau.date"), t("tableau.montantCol")]}
        >
          {factures.slice(0, 5).map((item) => {
            const id = String(item.facture_id ?? "");
            return (
              <tr key={id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/factures/${id}`}>{id}</Link>
                </td>
                <td className="px-4 py-3 text-muted">{dateLongue(String(item.date_soin ?? ""))}</td>
                <td className="px-4 py-3 text-right tabular-nums">{montant(Number(item.montant_total ?? 0), "")}</td>
              </tr>
            );
          })}
        </Tableau>
        <Tableau
          titre={t("tableau.recentesOrd")}
          href="/ordonnances"
          compte={compteOrdonnances}
          colonnes={[t("tableau.reference"), t("tableau.date"), ""]}
        >
          {ordonnances.slice(0, 5).map((item) => (
            <tr key={String(item.ordonnance_id)} className="border-t border-border">
              <td className="px-4 py-3">{String(item.ordonnance_id ?? "")}</td>
              <td className="px-4 py-3 text-muted">{dateLongue(String(item.date_prescription ?? ""))}</td>
              <td />
            </tr>
          ))}
        </Tableau>
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("tableau.monContrat")}</h2>
            {actif ? (
              <span className="inline-flex items-center gap-1 text-sm text-risk-low">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 3 3 5-6" />
                </svg>
                {t("tableau.actif")}
              </span>
            ) : (
              <span className="text-sm text-muted">{texte(contrat.statut)}</span>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("tableau.titulaire")}</dt>
              <dd className="text-right font-medium">{nom || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("tableau.contrat")}</dt>
              <dd className="text-right font-medium">{texte(contrat.contrat_id)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("garanties.formule")}</dt>
              <dd>
                {formule === "—" ? (
                  "—"
                ) : (
                  <span className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold tracking-wide text-primary">{formule}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t("garanties.date_effet")}</dt>
              <dd>{contrat.date_effet ? dateCourte(String(contrat.date_effet)) : "—"}</dd>
            </div>
          </dl>
          <Link className="mt-4 inline-flex text-sm font-medium text-primary" href="/garanties">
            {t("tableau.voirGaranties")} →
          </Link>
        </section>
        <CarteAssistant formule={formule === "—" ? "" : formule} />
      </aside>
    </div>
  );
}

function Compteur({
  href,
  icone,
  titre,
  valeur,
  lien,
  note = "",
}: {
  href: string;
  icone: "facture" | "ordonnance" | "remboursement";
  titre: string;
  valeur: string;
  lien: string;
  note?: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <IconeCompteur nom={icone} />
        </span>
        {titre}
      </div>
      <p className="mt-3 text-4xl font-semibold tabular-nums">{valeur}</p>
      {lien ? (
        <Link className="mt-2 inline-flex text-sm font-medium text-primary" href={href}>
          {lien} →
        </Link>
      ) : (
        <p className="mt-2 text-sm text-muted">{note}</p>
      )}
    </section>
  );
}

function IconeCompteur({ nom }: { nom: "facture" | "ordonnance" | "remboursement" }) {
  if (nom === "ordonnance") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (nom === "remboursement") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </svg>
  );
}

function Tableau({
  titre,
  href,
  compte,
  colonnes,
  children,
}: {
  titre: string;
  href: string;
  compte: string;
  colonnes: string[];
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="font-semibold">{titre}</h2>
        <Link className="text-sm font-medium text-primary" href={href}>
          {t("tableau.toutVoir")} ({compte}) →
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            {colonnes.map((colonne) => (
              <th key={colonne || "vide"} className={`px-4 py-2 font-normal ${colonne === t("tableau.montantCol") ? "text-right" : ""}`}>
                {colonne}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
  );
}
