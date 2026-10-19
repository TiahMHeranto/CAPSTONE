"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function Distribution({ lignes }: { lignes: { tranche: string; nb: number }[] }) {
  if (!lignes.length) return null;
  return (
    <div className="h-64 rounded-lg border border-border bg-surface p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={lignes}>
          <XAxis dataKey="tranche" />
          <YAxis />
          <Bar dataKey="nb" fill="var(--primary)" />
        </BarChart>
      </ResponsiveContainer>
      <table className="sr-only">
        <tbody>
          {lignes.map((ligne) => (
            <tr key={ligne.tranche}>
              <th scope="row">{ligne.tranche}</th>
              <td>{ligne.nb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
