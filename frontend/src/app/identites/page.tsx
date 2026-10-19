"use client";

import { useState } from "react";
import { Button, Champ, Etiquette } from "@/components/ui";
import { reveler } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

export default function Page() {
  const [message, setMessage] = useState("");
  const [resultat, setResultat] = useState("");
  return (
    <>
      <h1 className="text-3xl font-semibold">{t("nav.identites")}</h1>
      <p className="text-sm text-muted">{t("admin.avertir")}</p>
      <form
        className="mt-4 max-w-md space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const recu = await reveler(String(data.get("pseudo_id") ?? ""));
          if (recu.status !== 200) {
            setMessage(messageErreur(recu.data));
            setResultat("");
            return;
          }
          setMessage("");
          setResultat(JSON.stringify(recu.data));
        }}
      >
        <label>
          <Etiquette>{t("admin.pseudo")}</Etiquette>
          <Champ name="pseudo_id" required minLength={64} maxLength={64} className="font-mono" />
        </label>
        <Button type="submit">{t("admin.reveler")}</Button>
        {message ? <p role="alert">{message}</p> : null}
        {resultat ? <pre className="overflow-auto text-sm">{resultat}</pre> : null}
      </form>
    </>
  );
}
