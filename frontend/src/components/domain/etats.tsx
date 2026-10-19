import { Pouls } from "@/components/domain/pouls";
import { Button } from "@/components/ui";
import { t } from "@/i18n/traduire";

export function Vide({ texte }: { texte?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-6 text-muted">
      <Pouls className="h-6 w-14 text-primary" />
      <p>{texte ?? t("vide")}</p>
    </div>
  );
}

export function Erreur({ texte }: { texte?: string }) {
  return (
    <div className="rounded-md bg-danger-bg p-4 text-danger" role="alert">
      <p>{texte ?? t("erreur")}</p>
      <form className="mt-3" action="">
        <Button variante="secondary" type="submit">
          {t("reessayer")}
        </Button>
      </form>
    </div>
  );
}

export function Interdit() {
  return (
    <div className="py-8">
      <Pouls className="mb-3 h-6 w-14 text-primary" />
      <p>{t("interdit")}</p>
    </div>
  );
}
