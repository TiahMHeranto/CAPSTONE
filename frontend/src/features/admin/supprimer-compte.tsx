"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { supprimerCompte } from "@/features/admin/api";
import { messageErreur, t } from "@/i18n/traduire";

export function SupprimerCompte({ identifiant }: { identifiant: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <span className="flex items-center gap-2">
      <Button
        variante="danger"
        type="button"
        onClick={async () => {
          if (!window.confirm(t("admin.confirmerSuppression"))) return;
          const recu = await supprimerCompte(identifiant);
          if (recu.status === 200) router.refresh();
          else setMessage(messageErreur(recu.data));
        }}
      >
        {t("admin.supprimer")}
      </Button>
      {message ? <span className="text-danger">{message}</span> : null}
    </span>
  );
}
