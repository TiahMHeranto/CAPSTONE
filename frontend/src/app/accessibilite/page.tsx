import { t } from "@/i18n/traduire";

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl">{t("a11y.titre")}</h1>
      <p className="mt-4 max-w-prose">{t("a11y.texte")}</p>
    </main>
  );
}
