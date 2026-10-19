import { score } from "@/lib/format";
import { t } from "@/i18n/traduire";

type Niveau = "low" | "medium" | "high";

export function niveauDe(valeur: number, classe: string | null, seuil: number | null): Niveau {
  if (classe === "alerte") return "high";
  if (classe === "normale") return valeur < 0.5 ? "low" : "medium";
  if (seuil === null) return valeur < 0.5 ? "low" : "medium";
  if (valeur < 0.5) return "low";
  if (valeur < seuil) return "medium";
  return "high";
}

const COULEUR: Record<Niveau, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
};

export function ScoreRing({
  valeur,
  classe = null,
  seuil = null,
}: {
  valeur: number;
  classe?: string | null;
  seuil?: number | null;
}) {
  const niveau = niveauDe(valeur, classe, seuil);
  const rayon = 28;
  const tour = 2 * Math.PI * rayon;
  const part = Math.min(1, Math.max(0, valeur));
  return (
    <svg viewBox="0 0 72 72" className="h-20 w-20" role="img" aria-label={`${t("alerte.score")} ${score(valeur)}`}>
      <circle cx="36" cy="36" r={rayon} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={rayon}
        fill="none"
        stroke={COULEUR[niveau]}
        strokeWidth="6"
        strokeDasharray={`${tour * part} ${tour}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      {seuil !== null ? (
        <circle cx="36" cy="8" r="2" fill="var(--foreground)" aria-hidden="true" />
      ) : null}
      <text x="36" y="40" textAnchor="middle" className="fill-foreground text-[12px]" style={{ fontVariantNumeric: "tabular-nums" }}>
        {score(valeur)}
      </text>
    </svg>
  );
}
