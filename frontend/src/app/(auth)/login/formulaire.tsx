"use client";

import { useState } from "react";
import { Button, Champ } from "@/components/ui";
import { connecter } from "@/features/auth/api";
import { t } from "@/i18n/traduire";

export function FormulaireLogin() {
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setEnCours(true);
        const resultat = await connecter(new FormData(event.currentTarget));
        setEnCours(false);
        if (resultat && "erreur" in resultat) setErreur(t(`login.${resultat.erreur}`));
      }}
    >
      <label>
        <span className="mb-1 block text-sm text-white">{t("login.identifiant")}</span>
        <Champ name="identifiant" autoComplete="username" required />
      </label>
      <label>
        <span className="mb-1 block text-sm text-white">{t("login.motDePasse")}</span>
        <Champ name="mot_de_passe" type="password" autoComplete="current-password" required />
      </label>
      {erreur ? (
        <p className="text-sm text-danger" role="alert">
          {erreur}
        </p>
      ) : null}
      <Button variante="secondary" disabled={enCours} type="submit">
        {t("login.entrer")}
      </Button>
    </form>
  );
}
