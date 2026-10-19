"use client";

import { useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { creerCompte } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

export function CompteForm() {
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-6 grid gap-3 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const recu = await creerCompte({
          identifiant: String(data.get("identifiant") ?? ""),
          mot_de_passe: String(data.get("mot_de_passe") ?? ""),
          role: String(data.get("role") ?? ""),
          assure_id: String(data.get("assure_id") ?? "") || null,
          prestataire_id: String(data.get("prestataire_id") ?? "") || null,
        });
        setMessage(recu.status === 201 || recu.status === 200 ? t("alerte.enregistree") : messageErreur(recu.data));
      }}
    >
      <h2 className="md:col-span-2 text-xl">{t("admin.creer")}</h2>
      <label>
        <Etiquette>{t("login.identifiant")}</Etiquette>
        <Champ name="identifiant" required minLength={3} />
      </label>
      <label>
        <Etiquette>{t("login.motDePasse")}</Etiquette>
        <Champ name="mot_de_passe" type="password" required minLength={8} />
      </label>
      <label>
        <Etiquette>{t("role")}</Etiquette>
        <Champ name="role" required />
      </label>
      <label>
        <Etiquette>{t("factures.assure")}</Etiquette>
        <Champ name="assure_id" />
      </label>
      <label>
        <Etiquette>{t("factures.prestataire")}</Etiquette>
        <Champ name="prestataire_id" />
      </label>
      {message ? <p role="status">{message}</p> : null}
      <Button type="submit">{t("admin.creer")}</Button>
    </form>
  );
}
