"use client";

import { useState } from "react";
import { Button, Champ } from "@/components/ui";
import { connecter } from "@/features/auth/api";
import { t } from "@/i18n/traduire";

export function FormulaireLogin() {
  const [erreur, setErreur] = useState("");
  const [oublie, setOublie] = useState(false);
  const [enCours, setEnCours] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setEnCours(true);
        const resultat = await connecter(new FormData(event.currentTarget));
        setEnCours(false);
        if (resultat && "erreur" in resultat) setErreur(t(`login.${resultat.erreur}`));
      }}
    >
      <label>
        <span className="mb-1 block text-sm">{t("login.identifiant")}</span>
        <Champ name="identifiant" autoComplete="username" required />
      </label>
      <div>
        <div className="mb-1 flex items-center justify-between gap-3">
          <label className="text-sm" htmlFor="mot-de-passe">
            {t("login.motDePasse")}
          </label>
          <button className="min-h-11 text-sm text-primary" type="button" onClick={() => setOublie(true)}>
            {t("login.oublie")}
          </button>
        </div>
        <Champ id="mot-de-passe" name="mot_de_passe" type="password" autoComplete="current-password" required />
        {oublie ? <p className="mt-2 text-sm text-muted">{t("login.oublieTexte")}</p> : null}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input className="h-4 w-4" name="rester" type="checkbox" />
        {t("login.rester")}
      </label>
      {erreur ? (
        <p className="text-sm text-danger" role="alert">
          {erreur}
        </p>
      ) : null}
      <Button className="w-full" disabled={enCours} type="submit">
        {t("login.entrer")}
      </Button>
      <p className="text-sm text-muted">{t("login.securite")}</p>
    </form>
  );
}
