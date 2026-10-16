"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bandeau, Carte, Etiquette, bouton, boutonSecond, champ } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";

type RoleCompte = "assure" | "prestataire" | "gestionnaire" | "administrateur";

type Personne = {
  assure_id?: string;
  prestataire_id?: string;
  nom?: string;
  type?: string;
  ville?: string;
  contrat_id?: string;
  formule?: string;
  rang?: string;
  statut?: string;
};

type Compte = {
  identifiant: string;
  role: string;
  assure_id: string | null;
  prestataire_id: string | null;
  actif: boolean;
};

const ROLES_COMPTE: RoleCompte[] = ["assure", "prestataire", "gestionnaire", "administrateur"];

export default function Page() {
  const [role, setRole] = useState<RoleCompte>("assure");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [personnes, setPersonnes] = useState<Personne[]>([]);
  const [lien, setLien] = useState("");
  const [nomsEnCours, setNomsEnCours] = useState(false);
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    const recu = await appel("/admin/utilisateurs");
    if (recu.status === 200) setComptes((recu.data.utilisateurs as Compte[]) ?? []);
    else setReponse(recu);
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    if (role !== "assure" && role !== "prestataire") {
      setPersonnes([]);
      return;
    }
    let ignore = false;
    setNomsEnCours(true);
    appel(`/admin/annuaire?cible=${role}`).then((recu) => {
      if (ignore) return;
      setNomsEnCours(false);
      if (recu.status === 200) setPersonnes((recu.data.personnes as Personne[]) ?? []);
      else setReponse(recu);
    });
    return () => {
      ignore = true;
    };
  }, [role]);

  const rattache = role === "assure" || role === "prestataire";

  async function creer(event: FormEvent) {
    event.preventDefault();
    setEnCours(true);
    const recu = await appel("/admin/utilisateurs", {
      method: "POST",
      body: {
        identifiant,
        mot_de_passe: motDePasse,
        role,
        assure_id: role === "assure" ? lien : null,
        prestataire_id: role === "prestataire" ? lien : null,
      },
    });
    setReponse(recu);
    setEnCours(false);
    if (recu.status === 201) {
      setIdentifiant("");
      setMotDePasse("");
      setLien("");
      charger();
    }
  }

  return (
    <>
      <div>
        <h1 className="text-4xl">Utilisateurs</h1>
        <p className="mt-2 text-sm text-ink/70">
          Choisissez la personne par son nom. Le compte est rattaché à son identifiant en base. Le gestionnaire et
          l&apos;administrateur n&apos;ont pas de dossier personnel.
        </p>
      </div>
      <Carte titre="Nouveau compte">
        <form onSubmit={creer} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ROLES_COMPTE.map((item) => (
              <button
                key={item}
                className={item === role ? bouton : boutonSecond}
                type="button"
                onClick={() => {
                  setRole(item);
                  setLien("");
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <label>
            <Etiquette>Identifiant</Etiquette>
            <input className={champ} value={identifiant} onChange={(event) => setIdentifiant(event.target.value)} />
          </label>
          <label>
            <Etiquette>Mot de passe</Etiquette>
            <input
              className={champ}
              type="password"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(event) => setMotDePasse(event.target.value)}
            />
          </label>
          {rattache ? (
            <label>
              <Etiquette>{role === "assure" ? "Assuré" : "Professionnel de santé"}</Etiquette>
              <select className={champ} value={lien} onChange={(event) => setLien(event.target.value)}>
                <option value="">{nomsEnCours ? "Chargement des noms…" : "Choisir un nom"}</option>
                {personnes.map((personne) => {
                  const id = personne.assure_id ?? personne.prestataire_id ?? "";
                  const precision = [personne.ville, personne.type, personne.rang].filter(Boolean).join(" · ");
                  return (
                    <option key={id} value={id}>
                      {personne.nom}
                      {precision ? ` — ${precision}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}
          <button className={bouton} type="submit" disabled={enCours || !identifiant || motDePasse.length < 8 || (rattache && !lien)}>
            Créer
          </button>
        </form>
        {reponse ? <Bandeau status={reponse.status} data={reponse.data} /> : null}
      </Carte>
      <Carte titre="Comptes">
        <ul className="divide-y divide-line text-sm">
          {comptes.map((compte) => {
            const personne = personnes.find(
              (item) =>
                (compte.assure_id && item.assure_id === compte.assure_id) ||
                (compte.prestataire_id && item.prestataire_id === compte.prestataire_id),
            );
            return (
              <li key={compte.identifiant} className="flex flex-wrap justify-between gap-2 py-3">
                <span className="font-semibold">{compte.identifiant}</span>
                <span>
                  {compte.role}
                  {personne?.nom ? ` · ${personne.nom}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </Carte>
    </>
  );
}
