import type { ReactNode } from "react";

export const champ =
  "w-full rounded-md border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-teal";

export const bouton =
  "rounded-md bg-teal px-4 py-2 text-sm font-semibold text-paper hover:bg-deep disabled:opacity-50";

export const boutonSecond =
  "rounded-md border border-line bg-card px-4 py-2 text-sm font-semibold text-ink hover:border-teal disabled:opacity-50";

export function Carte({ titre, children }: { titre?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
      {titre ? <h2 className="mb-4 text-xl">{titre}</h2> : null}
      {children}
    </section>
  );
}

export function Grille({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

export function Etiquette({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/60">{children}</span>;
}

type Rejet = { code?: string; motif?: string };

export function Bandeau({ status, data }: { status: number | null; data: unknown }) {
  if (status === null) return null;
  const corps = (data ?? {}) as { code?: string; motif?: string; rejets?: Rejet[]; valide?: boolean };
  const ok = status >= 200 && status < 300;
  return (
    <div className={`mt-4 rounded-lg border p-4 text-sm ${ok ? "border-ok/30 bg-ok/5" : "border-alert/30 bg-alert/5"}`}>
      <p className="font-semibold">
        HTTP {status}
        {corps.code ? ` · ${corps.code}` : ""}
        {corps.valide === false ? " · rejeté" : ""}
      </p>
      {corps.motif ? <p className="mt-1">{corps.motif}</p> : null}
      {corps.rejets?.length ? (
        <ul className="mt-2 space-y-1">
          {corps.rejets.map((rejet, index) => (
            <li key={`${rejet.code}-${index}`}>
              <span className="font-semibold">{rejet.code}</span>
              {rejet.motif ? ` — ${rejet.motif}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-ink/70">Réponse brute</summary>
        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}
