"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Carte } from "@/components/ui";
import { appel, type Reponse } from "@/lib/api";
import { LIENS } from "@/lib/navigation";
import { LIBELLES, lireSession, type Role } from "@/lib/session";

const PARCOURS: Record<Role, string[]> = {
  prestataire: ["Valider une facture", "Déposer une facture ou un lot", "Relire ses propres dépôts"],
  assure: ["Consulter une facture qui le concerne", "Voir ses remboursements"],
  gestionnaire: [
    "Déposer et scorer",
    "Lire le score et les contributions",
    "Trancher une alerte",
    "Lire la synthèse et les métriques",
  ],
  administrateur: [
    "Changer le seuil et la version active",
    "Lire la dérive et la supervision",
    "Réidentifier ou effacer un pseudonyme avec la clef admin",
  ],
};

export default function Page() {
  const [role, setRole] = useState<Role | null>(null);
  const [sante, setSante] = useState<Reponse | null>(null);

  useEffect(() => {
    setRole(lireSession()?.role ?? null);
    appel("/health").then(setSante);
  }, []);

  const liens = LIENS.filter((lien) => lien.href !== "/tableau" && role && lien.roles.includes(role));

  return (
    <>
      <div>
        <h1 className="text-4xl">Accueil</h1>
        <p className="mt-2 text-ink/70">
          {role ? `${LIBELLES[role]}. ` : ""}
          Les écrans appellent l&apos;API déjà en service. Rien n&apos;est recalculé dans le navigateur.
        </p>
      </div>
      <Carte titre="Santé">
        <p className="text-sm">
          {sante
            ? `${String(sante.data.status)} · base ${String(sante.data.database)} · constante modèle ${String(sante.data.model_version)}`
            : "Lecture en cours…"}
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Le champ model_version de /health est une constante du service. La version qui score se lit dans les
          réglages.
        </p>
      </Carte>
      {role ? (
        <Carte titre="Ce rôle peut">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {PARCOURS[role].map((ligne) => (
              <li key={ligne}>{ligne}</li>
            ))}
          </ul>
        </Carte>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {liens.map((lien) => (
          <Link key={lien.href} href={lien.href} className="rounded-xl border border-line bg-card px-4 py-4 hover:border-teal">
            <span className="display text-xl">{lien.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
