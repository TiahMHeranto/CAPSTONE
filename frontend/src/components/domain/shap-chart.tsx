import { t } from "@/i18n/traduire";

export type Explication = { variable: string; contribution: number; libelle: string };

export function ShapChart({ lignes }: { lignes: Explication[] }) {
  const visibles = lignes.slice(0, 8);
  const max = Math.max(0.01, ...visibles.map((ligne) => Math.abs(ligne.contribution)));
  if (!visibles.length) return <p className="text-sm text-muted">{t("vide")}</p>;
  return (
    <div>
      <ul className="space-y-2">
        {visibles.map((ligne) => {
          const hausse = ligne.contribution >= 0;
          const largeur = `${Math.round((Math.abs(ligne.contribution) / max) * 100)}%`;
          return (
            <li key={ligne.variable}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span>{ligne.libelle || ligne.variable}</span>
                <span className="font-mono tabular-nums">{hausse ? "+" : "−"}{Math.abs(ligne.contribution).toFixed(2)}</span>
              </div>
              <div className="h-2 rounded-sm bg-surface-muted">
                <div
                  className="h-2 rounded-sm"
                  style={{ width: largeur, background: hausse ? "var(--risk-high)" : "var(--info)" }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>{t("alerte.pourquoi")}</caption>
        <tbody>
          {visibles.map((ligne) => (
            <tr key={`${ligne.variable}-t`}>
              <th scope="row">{ligne.libelle || ligne.variable}</th>
              <td>{ligne.contribution}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
