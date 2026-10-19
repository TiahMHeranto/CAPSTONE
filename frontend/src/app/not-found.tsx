import Link from "next/link";
import { t } from "@/i18n/traduire";

export default function Introuvable() {
  return (
    <main className="p-6">
      <h1 className="text-2xl">Page introuvable</h1>
      <Link className="mt-3 inline-block" href="/">
        {t("retour")}
      </Link>
    </main>
  );
}
