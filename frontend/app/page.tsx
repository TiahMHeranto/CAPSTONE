"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Bandeau, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { LIBELLES, ROLES, ecrireSession, lireSession, type Role } from "@/lib/session";

export default function Page() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState("gestionnaire");
  const [motDePasse, setMotDePasse] = useState("");
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [sante, setSante] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (lireSession()) router.replace("/tableau");
    appel("/health").then(setSante);
  }, [router]);

  async function connecter(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    const recu = await appel("/auth/login", {
      method: "POST",
      body: { identifiant, mot_de_passe: motDePasse },
    });
    setReponse(recu);
    setEnCours(false);
    if (recu.status === 200 && typeof recu.data.token === "string" && ROLES.includes(recu.data.role as Role)) {
      ecrireSession({
        identifiant,
        role: recu.data.role as Role,
        token: recu.data.token,
      });
      router.push("/tableau");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-5 py-10 md:grid-cols-2">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal">Tiers payant</p>
        <h1 className="mt-2 text-5xl leading-tight">PrediCare</h1>
        <p className="mt-4 max-w-md text-lg text-ink/80">
          Écran temporaire pour parcourir les quatre rôles : dépôt, score, alerte, décision, synthèse et
          pilotage.
        </p>
        {sante ? (
          <p className="mt-6 rounded-lg bg-mist px-4 py-3 text-sm">
            Santé API : {String(sante.data.status ?? "indisponible")} · base {String(sante.data.database ?? "—")} ·
            constante modèle {String(sante.data.model_version ?? "—")}. La version qui score est le réglage
            administrateur.
          </p>
        ) : null}
      </section>
      <form onSubmit={connecter} className="rounded-xl border border-line bg-card p-6 shadow-sm">
        <h2 className="text-2xl">Connexion</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              type="button"
              className={identifiant === role ? bouton : boutonSecond}
              onClick={() => setIdentifiant(role)}
            >
              {LIBELLES[role]}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          Identifiant
          <input className={`${champ} mt-1`} value={identifiant} onChange={(event) => setIdentifiant(event.target.value)} />
        </label>
        <label className="mt-3 block text-sm">
          Mot de passe
          <input
            className={`${champ} mt-1`}
            type="password"
            value={motDePasse}
            autoComplete="current-password"
            placeholder="AUTH_DEMO_PASSWORD"
            onChange={(event) => setMotDePasse(event.target.value)}
          />
        </label>
        <button className={`${bouton} mt-5 w-full`} disabled={enCours} type="submit">
          {enCours ? "Connexion…" : "Entrer"}
        </button>
        {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </form>
    </main>
  );
}
