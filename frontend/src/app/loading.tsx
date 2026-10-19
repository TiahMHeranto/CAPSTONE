import { t } from "@/i18n/traduire";

export default function Loading() {
  return <p className="p-6 text-sm text-muted">{t("chargement")}</p>;
}
