import { t } from "@/i18n/traduire";
import { niveauDe } from "@/components/domain/score-ring";

const STYLE = {
  low: "bg-risk-low-bg text-risk-low",
  medium: "bg-risk-medium-bg text-risk-medium",
  high: "bg-risk-high-bg text-risk-high",
};

const LIBELLE = {
  low: "alerte.faible",
  medium: "alerte.moyen",
  high: "alerte.eleve",
};

export function RiskBadge({
  valeur,
  classe = null,
  seuil = null,
}: {
  valeur: number;
  classe?: string | null;
  seuil?: number | null;
}) {
  const niveau = niveauDe(valeur, classe, seuil);
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm ${STYLE[niveau]}`}>
      <span aria-hidden="true">{niveau === "high" ? "▲" : niveau === "medium" ? "●" : "▼"}</span>
      {t(LIBELLE[niveau])}
    </span>
  );
}
