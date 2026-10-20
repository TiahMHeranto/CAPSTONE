import { AssistantFlottant } from "@/components/assistant-flottant";
import { BureauNav } from "@/components/bureau-nav";
import { EnteteBureau } from "@/components/entete-bureau";
import { t } from "@/i18n/traduire";
import { LIENS } from "@/lib/rbac";
import type { Session } from "@/lib/session";
import type { Role } from "@/lib/types";

function espaceDe(role: Role): string {
  if (role === "assure") return "coquille.assure";
  if (role === "prestataire") return "coquille.prestataire";
  return "coquille.espace";
}

export function Coquille({
  session,
  theme,
  nom = "",
  alertes = 0,
  children,
}: {
  session: Session;
  theme: string;
  nom?: string;
  alertes?: number;
  children: React.ReactNode;
}) {
  const espace = espaceDe(session.role);
  const liens = LIENS.filter((lien) => lien.roles.includes(session.role));
  return (
    <div className="bureau flex min-h-dvh flex-col bg-background md:h-dvh md:flex-row md:overflow-hidden">
      <a className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-surface focus:p-2" href="#contenu">
        {t("passer")}
      </a>
      <BureauNav liens={liens} session={session} nom={nom} alertes={alertes} espace={espace} />
      <div className="flex min-w-0 flex-1 flex-col md:h-dvh">
        <EnteteBureau liens={liens} sombre={theme === "dark"} espace={espace} />
        <main id="contenu" className="relative flex w-full min-h-0 flex-1 flex-col space-y-4 px-6 pb-10 md:overflow-auto">
          {children}
        </main>
        <AssistantFlottant />
      </div>
    </div>
  );
}
