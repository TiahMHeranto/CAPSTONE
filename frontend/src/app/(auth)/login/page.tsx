import { FormulaireLogin } from "@/app/(auth)/login/formulaire";
import { Scene } from "@/app/(auth)/login/scene";
import { t } from "@/i18n/traduire";

export default function Page() {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <Scene />
      <section className="relative flex min-h-dvh flex-col justify-center overflow-hidden bg-scene-teal px-8 py-12 text-white lg:px-16">
        <svg className="absolute top-8 right-8 h-16 w-16 opacity-25" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M28 4h8v20h20v8H36v20h-8V32H8v-8h20V4z" fill="currentColor" />
        </svg>
        <svg className="absolute -right-16 bottom-10 h-40 w-40 opacity-20" viewBox="0 0 160 160" aria-hidden="true">
          <path d="M80 10c40 0 70 30 70 70s-40 70-80 60S10 110 20 60 40 10 80 10z" fill="currentColor" />
        </svg>
        <div className="relative max-w-xl">
          <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">{t("login.bandeau")}</h1>
          <p className="mt-4 max-w-md text-2xl leading-snug text-white">{t("login.mission")}</p>
          <p className="mt-3 max-w-md text-white/90">{t("login.intro")}</p>
          <div className="mt-8 max-w-sm">
            <FormulaireLogin />
          </div>
        </div>
      </section>
    </main>
  );
}
