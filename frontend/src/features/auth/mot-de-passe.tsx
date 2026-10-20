"use client";

import { useId, useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { changerMotDePasse } from "@/features/auth/api";
import { messageErreur, t } from "@/i18n/traduire";

export function MotDePasseForm() {
  const panneau = useId();
  const [ouvert, setOuvert] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [enCours, setEnCours] = useState(false);

  function fermer() {
    setOuvert(false);
    setEnCours(false);
    if (!ok) setMessage("");
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <Button
        type="button"
        variante="secondary"
        aria-expanded={ouvert}
        aria-controls={panneau}
        onClick={() => {
          if (ouvert) fermer();
          else {
            setMessage("");
            setOk(false);
            setOuvert(true);
          }
        }}
      >
        {t("profil.modifier")}
      </Button>
      {ouvert ? (
        <form
          id={panneau}
          className="mt-3 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const nouveau = String(data.get("nouveau") ?? "");
            const confirmation = String(data.get("confirmation") ?? "");
            if (nouveau !== confirmation) {
              setOk(false);
              setMessage(t("erreurs.MOT_DIFFERENT"));
              return;
            }
            setEnCours(true);
            const recu = await changerMotDePasse({
              actuel: String(data.get("actuel") ?? ""),
              nouveau,
              confirmation,
            });
            setEnCours(false);
            if (recu.status === 200) {
              setOk(true);
              setMessage(t("profil.motChange"));
              setOuvert(false);
            } else {
              setOk(false);
              setMessage(messageErreur(recu.data));
            }
          }}
        >
          <label>
            <Etiquette>{t("profil.actuel")}</Etiquette>
            <Champ name="actuel" type="password" required autoComplete="current-password" />
          </label>
          <label>
            <Etiquette>{t("profil.nouveau")}</Etiquette>
            <Champ name="nouveau" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            <Etiquette>{t("profil.confirmation")}</Etiquette>
            <Champ name="confirmation" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={enCours}>
              {t("profil.changer")}
            </Button>
            <Button type="button" variante="ghost" onClick={fermer}>
              {t("profil.annuler")}
            </Button>
          </div>
          {message ? (
            <p className="text-sm text-danger" role="status">
              {message}
            </p>
          ) : null}
        </form>
      ) : null}
      {!ouvert && message ? (
        <p className={ok ? "mt-3 text-sm" : "mt-3 text-sm text-danger"} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
