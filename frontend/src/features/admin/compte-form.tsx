"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { annuaire, creerCompte } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

const ROLES = ["assure", "prestataire", "gestionnaire", "administrateur"] as const;

type Personne = {
  assure_id?: string;
  prestataire_id?: string;
  nom?: string;
  ville?: string;
  type?: string;
};

export function CompteForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [role, setRole] = useState("");
  const [personnes, setPersonnes] = useState<Personne[]>([]);

  useEffect(() => {
    if (role !== "assure" && role !== "prestataire") {
      setPersonnes([]);
      return;
    }
    let ignore = false;
    void annuaire(role).then((recu) => {
      if (ignore) return;
      const liste = recu.status === 200 && Array.isArray(recu.data.personnes) ? (recu.data.personnes as Personne[]) : [];
      setPersonnes(liste);
    });
    return () => {
      ignore = true;
    };
  }, [role]);

  const champ = role === "assure" ? "assure_id" : "prestataire_id";
  return (
    <form
      className="mt-6 grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const choisi = String(data.get("role") ?? "");
        const recu = await creerCompte({
          identifiant: String(data.get("identifiant") ?? ""),
          email: String(data.get("email") ?? ""),
          mot_de_passe: String(data.get("mot_de_passe") ?? ""),
          role: choisi,
          assure_id: choisi === "assure" ? String(data.get("personne") ?? "") : null,
          prestataire_id: choisi === "prestataire" ? String(data.get("personne") ?? "") : null,
        });
        if (recu.status === 201 || recu.status === 200) {
          setMessage(t("admin.compteCree"));
          form.reset();
          setRole("");
          router.refresh();
        } else setMessage(messageErreur(recu.data));
      }}
    >
      <h2 className="text-xl md:col-span-2">{t("admin.creer")}</h2>
      <label>
        <Etiquette>{t("login.identifiantCompte")}</Etiquette>
        <Champ name="identifiant" required minLength={3} autoComplete="off" />
      </label>
      <label>
        <Etiquette>{t("admin.email")}</Etiquette>
        <Champ name="email" type="email" required autoComplete="off" />
      </label>
      <label>
        <Etiquette>{t("login.motDePasse")}</Etiquette>
        <Champ name="mot_de_passe" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      <label>
        <Etiquette>{t("role")}</Etiquette>
        <select
          name="role"
          required
          className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">{t("admin.choisir")}</option>
          {ROLES.map((valeur) => (
            <option key={valeur} value={valeur}>
              {t(`roles.${valeur}`)}
            </option>
          ))}
        </select>
      </label>
      {role === "assure" || role === "prestataire" ? (
        <label className="md:col-span-2">
          <Etiquette>{role === "assure" ? t("factures.assure") : t("factures.prestataire")}</Etiquette>
          <select
            key={champ}
            name="personne"
            required
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground"
            defaultValue=""
          >
            <option value="">{t("admin.choisir")}</option>
            {personnes.map((personne) => {
              const id = String(personne.assure_id || personne.prestataire_id || "");
              const lieu = [personne.type, personne.ville].filter(Boolean).join(" · ");
              return (
                <option key={id} value={id}>
                  {personne.nom}
                  {lieu ? ` · ${lieu}` : ""}
                </option>
              );
            })}
          </select>
          {personnes.length === 0 ? <p className="mt-1 text-sm text-muted">{t("admin.aucunePersonne")}</p> : null}
        </label>
      ) : null}
      {message ? (
        <p className="md:col-span-2" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit">{t("admin.creer")}</Button>
    </form>
  );
}
