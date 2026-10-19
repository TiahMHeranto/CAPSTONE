"use client";

import { useRouter } from "next/navigation";
import { COOKIE_THEME } from "@/lib/cookies";
import { t } from "@/i18n/traduire";

export function ThemeButton({ sombre }: { sombre: boolean }) {
  const router = useRouter();
  return (
    <button
      className="min-h-11 px-2"
      type="button"
      onClick={() => {
        document.cookie = `${COOKIE_THEME}=${sombre ? "light" : "dark"}; Path=/; SameSite=Lax`;
        router.refresh();
      }}
    >
      {sombre ? t("themeClair") : t("theme")}
    </button>
  );
}
