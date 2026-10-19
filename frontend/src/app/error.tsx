"use client";

import { Button } from "@/components/ui";
import { t } from "@/i18n/traduire";

export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6" role="alert">
      <p>{t("erreur")}</p>
      <Button className="mt-3" variante="secondary" type="button" onClick={reset}>
        {t("reessayer")}
      </Button>
    </div>
  );
}
