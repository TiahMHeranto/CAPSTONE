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
const PLAFOND_REMBOURSEMENTS = 100;

export default async function Page() {
  const session = await lireSession();
  if (!session) redirect("/login");
  const profilRecu = await appel("/me/profil");
  if (profilRecu.status !== 200) return <Erreur texte={messageErreur(profilRecu.data)} />;
  const profil = profilRecu.data;
  const personnel = session.role === "assure" || session.role === "prestataire";
  const bureau = session.role === "gestionnaire" || session.role === "administrateur";
  const [factures, remboursements, bi, alertes, supervision] = await Promise.all([
    personnel ? appel("/me/factures") : vide(),
    session.role === "assure" ? appel("/me/remboursements") : vide(),
    bureau ? appel("/bi") : vide(),
    bureau ? appel("/alerts") : vide(),
    session.role === "administrateur" ? appel("/admin/supervision") : vide(),
  ]);
  const contrat = objet(profil.contrat);
  const lignesFactures = liste(factures, "factures");
  const lignesRemboursements = liste(remboursements, "remboursements");
  const lignesAlertes = liste(alertes, "alertes");
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
        compteFactures={compter(lignesFactures, factures, PLAFOND_FACTURES)}
        compteRemboursements={compter(lignesRemboursements, remboursements, PLAFOND_REMBOURSEMENTS)}
        aucunRemboursement={remboursements?.status === 200 && lignesRemboursements.length === 0}
      />
    );
  }

  if (bureau) {
    return (
      <VueBureau
        prenom={prenomAffiche(profil)}
        repli={session.identifiant}
        volumes={volumes}
        biOk={bi?.status === 200}
        alertes={lignesAlertes}
        decisions={liste(bi, "decisions")}
        distribution={repartition(bi)}
        admin={session.role === "administrateur"}
        supervisionOk={supervision?.status === 200}
        metriques={metriques}
        latence={latence}
        derive={derive}
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

function repartition(recu: Reponse | null): { tranche: string; nb: number }[] {
  if (!recu || recu.status !== 200 || !Array.isArray(recu.data.distribution)) return [];
  const sommes = new Map<string, number>();
  for (const ligne of recu.data.distribution as Record<string, unknown>[]) {
    const tranche = String(ligne.tranche ?? "");
    const nb = typeof ligne.nb === "number" ? ligne.nb : 0;
    if (!tranche) continue;
    sommes.set(tranche, (sommes.get(tranche) ?? 0) + nb);
  }
  return [...sommes.entries()].map(([tranche, nb]) => ({ tranche, nb }));
}

function VueBureau({
  prenom,
  repli,
  volumes,
  biOk,
  alertes,
  decisions,
  distribution,
  admin,
  supervisionOk,
  metriques,
  latence,
  derive,
}: {
  prenom: string;
  repli: string;
  volumes: Record<string, unknown>;
  biOk: boolean;
  alertes: Record<string, unknown>[];
  decisions: Record<string, unknown>[];
  distribution: { tranche: string; nb: number }[];
  admin: boolean;
  supervisionOk: boolean;
  metriques: Record<string, unknown>;
  latence: Record<string, unknown>;
  derive: Record<string, unknown>;
}) {
  const salut = prenom || repli;
  const recus = typeof volumes.nb_factures === "number" ? volumes.nb_factures : null;
  const normales = typeof volumes.nb_normales === "number" ? volumes.nb_normales : 0;
  const signalees = typeof volumes.nb_alertes_modele === "number" ? volumes.nb_alertes_modele : 0;
  const rejets = typeof volumes.nb_rejets === "number" ? volumes.nb_rejets : 0;
  const totalParts = normales + signalees + rejets;
  const part = (valeur: number) => (totalParts > 0 ? (valeur / totalParts) * 100 : 0);
  const anneau = `conic-gradient(#1f8a70 0 ${part(normales)}%, #e07a3d ${part(normales)}% ${part(normales) + part(signalees)}%, #c2410c ${part(normales) + part(signalees)}% 100%)`;
  const maxScore = Math.max(1, ...distribution.map((ligne) => ligne.nb));
  const mois = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-wide text-muted">{t("tableau.regard")}</p>
          <h1 className="mt-1 text-3xl font-semibold">{t("nav.tableau")}</h1>
          <p className="mt-1 text-sm text-muted">
            {t("tableau.bonjour")} {salut}, {t("tableau.bonjourActivite")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">{mois}</span>
          <Link className="rounded-xl bg-foreground px-4 py-2 text-sm text-background" href="/factures">
            {t("tableau.voirDossiers")}
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CarteKpi titre={t("tableau.dossiersRecus")} valeur={biOk && recus !== null ? nombreBrut(recus) : "—"} href="/pilotage" />
        <CarteKpi titre={t("tableau.montantEconomise")} valeur={biOk ? argentBrut(volumes.montant_economise) : "—"} href="/pilotage" />
        <CarteKpi titre={t("tableau.decisions")} valeur={biOk ? nombreBrut(volumes.nb_decisions) : "—"} href="/pilotage" />
        <CarteKpi titre={t("tableau.aVerifier")} valeur={String(alertes.length)} href="/alertes" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">{t("tableau.activite")}</h2>
          {distribution.length === 0 ? (
            <p className="mt-6 text-sm text-muted">{t("tableau.activiteVide")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {distribution.map((ligne) => (
                <li key={ligne.tranche}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{ligne.tranche}</span>
                    <span className="tabular-nums text-muted">{ligne.nb}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(ligne.nb / maxScore) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">{t("tableau.repartition")}</h2>
          <p className="text-sm text-muted">{biOk && recus !== null ? `${nombreBrut(recus)} ${t("tableau.dossiersRecus").toLowerCase()}` : "—"}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: totalParts > 0 ? anneau : "var(--surface-muted)" }}>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-surface text-sm font-semibold">
                {totalParts > 0 ? `${Math.round(part(normales))} %` : "—"}
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li>{t("tableau.sansAlerte")} · {normales}</li>
              <li>{t("tableau.alertesModele")} · {signalees}</li>
              <li>{t("tableau.rejets")} · {rejets}</li>
            </ul>
          </div>
        </section>
      </div>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <p className="text-sm">
          {alertes.length > 0 ? t("tableau.attention") : t("tableau.aucuneAlerte")}
          {alertes.length > 0 ? <span className="mt-1 block text-muted">{alertes.length}</span> : null}
        </p>
        <Link className="text-sm font-medium" href="/alertes">
          {t("tableau.examiner")}
        </Link>
      </section>
      {alertes.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-3">
          {alertes.slice(0, 3).map((item) => {
            const id = String(item.facture_id ?? "");
            return (
              <Link key={id} className="rounded-2xl border border-border bg-surface p-4" href={`/factures/${id}`}>
                <p className="font-mono text-sm">{id}</p>
                <p className="mt-3 text-2xl font-semibold tabular-nums">{score(Number(item.score ?? 0))}</p>
                <p className="mt-2 text-sm text-risk-medium">{t("tableau.aRevoir")}</p>
              </Link>
            );
          })}
        </div>
      ) : null}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold">{t("tableau.dossiersRecents")}</h2>
          <Link className="text-sm font-medium" href="/pilotage">
            {t("tableau.voirDecisions")}
          </Link>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-normal">{t("tableau.colonneDossier")}</th>
              <th className="px-4 py-2 font-normal">{t("tableau.colonneDecision")}</th>
              <th className="px-4 py-2 font-normal">{t("tableau.colonneDate")}</th>
              <th className="px-4 py-2 text-right font-normal">{t("tableau.colonneScore")}</th>
            </tr>
          </thead>
          <tbody>
            {decisions.slice(0, 5).map((item) => {
              const id = String(item.facture_id ?? "");
              return (
                <tr key={`${id}-${String(item.created_at)}`} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link className="font-mono" href={`/factures/${id}`}>{id}</Link>
                  </td>
                  <td className="px-4 py-3">{texte(item.decision)}</td>
                  <td className="px-4 py-3 text-muted">{dateCourte(String(item.created_at ?? ""))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{typeof item.score === "number" ? score(item.score) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {admin && supervisionOk ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicateur href="/supervision" titre={t("admin.volume")} valeur={texte(metriques.volume)} />
          <Indicateur href="/supervision" titre={t("admin.erreurs")} valeur={texte(metriques.erreurs)} />
          <Indicateur href="/supervision" titre={t("admin.latence")} valeur={`${texte(latence.p50)} / ${texte(latence.p95)}`} />
          <Indicateur href="/supervision" titre={t("tableau.derive")} valeur={texte(derive.etat)} />
        </div>
      ) : null}
    </div>
  );
}

function CarteKpi({ titre, valeur, href }: { titre: string; valeur: string; href: string }) {
  return (
    <Link className="rounded-2xl border border-border bg-surface p-4" href={href}>
      <h2 className="text-sm text-muted">{titre}</h2>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{valeur}</p>
    </Link>
  );
}

function nombreBrut(valeur: unknown): string {
  if (typeof valeur !== "number") return "—";
  return new Intl.NumberFormat("fr-FR").format(valeur);
}

function argentBrut(valeur: unknown): string {
  if (typeof valeur !== "number") return "—";
  return montant(valeur, "MGA");
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
  compteFactures,
  compteRemboursements,
  aucunRemboursement,
}: {
  nom: string;
  prenom: string;
  contrat: Record<string, unknown>;
  factures: Record<string, unknown>[];
  compteFactures: string;
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Compteur href="/factures" icone="facture" titre={t("tableau.factures")} valeur={compteFactures} lien={t("tableau.voirFactures")} />
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
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
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
          <Link className="mt-4 inline-flex text-sm font-medium text-primary" href="/assistant">
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
    <section className="rounded-2xl border border-border bg-surface p-4">
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
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
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
