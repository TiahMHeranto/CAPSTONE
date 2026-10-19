"use client";

import { t } from "@/i18n/traduire";

export function CarteAssistant({ formule }: { formule: string }) {
  const couverture = formule ? `${t("tableau.qFormule")} ${formule} ?` : `${t("tableau.qFormule")} ?`;

  function ouvrir(question?: string) {
    window.dispatchEvent(new CustomEvent("prediccare-assistant", { detail: { question } }));
  }

  return (
    <section className="rounded-2xl bg-navy p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">{t("tableau.question")}</h2>
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">{t("assistant.badge")}</span>
      </div>
      <p className="mt-2 text-sm text-white/80">{t("tableau.questionTexte")}</p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          className="block min-h-11 w-full rounded-xl border border-white/20 px-3 text-left text-sm"
          onClick={() => ouvrir(couverture)}
        >
          {couverture}
        </button>
        <button
          type="button"
          className="block min-h-11 w-full rounded-xl border border-white/20 px-3 text-left text-sm"
          onClick={() => ouvrir(t("tableau.qFacture"))}
        >
          {t("tableau.qFacture")}
        </button>
      </div>
      <button
        type="button"
        className="mt-4 min-h-11 w-full rounded-xl bg-[#1fbf75] text-sm font-medium text-white"
        onClick={() => ouvrir()}
      >
        {t("tableau.ouvrirAssistant")}
      </button>
    </section>
  );
}
