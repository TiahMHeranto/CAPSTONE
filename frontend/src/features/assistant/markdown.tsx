"use client";

import { useState } from "react";
import { t } from "@/i18n/traduire";

type Bloc =
  | { type: "p" | "quote"; texte: string }
  | { type: "h"; niveau: number; texte: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; lang: string; texte: string }
  | { type: "table"; entetes: string[]; lignes: string[][] };

function lienSur(url: string): string | null {
  try {
    const adresse = new URL(url);
    if (adresse.protocol !== "http:" && adresse.protocol !== "https:") return null;
    return adresse.toString();
  } catch {
    return null;
  }
}

function enLigne(texte: string, cle: string, ouvrir: (url: string) => void): React.ReactNode[] {
  const motif = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(!\[[^\]]*\]\(https?:\/\/[^)\s]+\))|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  const noeuds: React.ReactNode[] = [];
  let curseur = 0;
  let rang = 0;
  for (const trouve of texte.matchAll(motif)) {
    const index = trouve.index ?? 0;
    if (index > curseur) noeuds.push(texte.slice(curseur, index));
    const morceau = trouve[0];
    const id = `${cle}-${rang++}`;
    if (morceau.startsWith("`")) noeuds.push(<code key={id} className="rounded bg-surface-muted px-1 font-mono text-[0.9em]">{morceau.slice(1, -1)}</code>);
    else if (morceau.startsWith("**")) noeuds.push(<strong key={id}>{morceau.slice(2, -2)}</strong>);
    else if (morceau.startsWith("*")) noeuds.push(<em key={id}>{morceau.slice(1, -1)}</em>);
    else if (morceau.startsWith("!")) {
      const alt = morceau.slice(2, morceau.indexOf("]"));
      const url = lienSur(morceau.slice(morceau.indexOf("](") + 2, -1));
      if (url) {
        noeuds.push(
          <button key={id} type="button" className="block" onClick={() => ouvrir(url)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={alt} src={url} loading="lazy" className="mt-2 max-h-64 min-h-16 rounded-lg" />
          </button>,
        );
      }
    } else {
      const libelle = morceau.slice(1, morceau.indexOf("]"));
      const url = lienSur(morceau.slice(morceau.indexOf("](") + 2, -1));
      if (url) {
        noeuds.push(
          <a key={id} href={url} target="_blank" rel="noopener noreferrer" className="underline">
            {libelle}
          </a>,
        );
      } else noeuds.push(morceau);
    }
    curseur = index + morceau.length;
  }
  if (curseur < texte.length) noeuds.push(texte.slice(curseur));
  return noeuds;
}

function cellules(ligne: string): string[] {
  return ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cellule) => cellule.trim());
}

function analyser(source: string): Bloc[] {
  const lignes = source.replace(/\r\n/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  let i = 0;
  while (i < lignes.length) {
    const ligne = lignes[i];
    if (ligne.startsWith("```")) {
      const lang = ligne.slice(3).trim();
      const corps: string[] = [];
      i += 1;
      while (i < lignes.length && !lignes[i].startsWith("```")) {
        corps.push(lignes[i]);
        i += 1;
      }
      blocs.push({ type: "code", lang, texte: corps.join("\n") });
      i += 1;
      continue;
    }
    if (/^\s*\|/.test(ligne) && i + 1 < lignes.length && /^\s*\|?\s*-+/.test(lignes[i + 1])) {
      const entetes = cellules(ligne);
      i += 2;
      const rangees: string[][] = [];
      while (i < lignes.length && /^\s*\|/.test(lignes[i])) {
        rangees.push(cellules(lignes[i]));
        i += 1;
      }
      blocs.push({ type: "table", entetes, lignes: rangees });
      continue;
    }
    const titre = /^(#{1,3})\s+(.*)$/.exec(ligne);
    if (titre) {
      blocs.push({ type: "h", niveau: titre[1].length, texte: titre[2] });
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(ligne)) {
      const items: string[] = [];
      while (i < lignes.length && /^\s*[-*]\s+/.test(lignes[i])) {
        items.push(lignes[i].replace(/^\s*[-*]\s+/, ""));
        i += 1;
      }
      blocs.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(ligne)) {
      const items: string[] = [];
      while (i < lignes.length && /^\s*\d+\.\s+/.test(lignes[i])) {
        items.push(lignes[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocs.push({ type: "ol", items });
      continue;
    }
    if (/^\s*>\s?/.test(ligne)) {
      const items: string[] = [];
      while (i < lignes.length && /^\s*>\s?/.test(lignes[i])) {
        items.push(lignes[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocs.push({ type: "quote", texte: items.join(" ") });
      continue;
    }
    if (!ligne.trim()) {
      i += 1;
      continue;
    }
    const paragraphe: string[] = [];
    while (i < lignes.length && lignes[i].trim() && !/^(```|#{1,3}\s|[-*]\s|\d+\.\s|>\s?|\s*\|)/.test(lignes[i])) {
      paragraphe.push(lignes[i]);
      i += 1;
    }
    blocs.push({ type: "p", texte: paragraphe.join(" ") });
  }
  return blocs;
}

function BlocCode({ bloc }: { bloc: Extract<Bloc, { type: "code" }> }) {
  const [copie, setCopie] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between bg-surface-muted px-3 py-1 text-xs text-muted">
        <span>{bloc.lang || "texte"}</span>
        <button
          type="button"
          className="min-h-11 px-2"
          onClick={() => {
            void navigator.clipboard.writeText(bloc.texte).then(() => {
              setCopie(true);
              window.setTimeout(() => setCopie(false), 1600);
            });
          }}
        >
          {copie ? t("assistant.copie") : t("assistant.copier")}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-sm">
        <code>{bloc.texte}</code>
      </pre>
    </div>
  );
}

export function TexteAssistant({ texte }: { texte: string }) {
  const [photo, setPhoto] = useState("");
  const blocs = analyser(texte);
  return (
    <div className="space-y-3 wrap-anywhere text-[15px] leading-relaxed select-text">
      {blocs.map((bloc, index) => {
        const cle = `${index}-${bloc.type}`;
        if (bloc.type === "code") return <BlocCode key={cle} bloc={bloc} />;
        if (bloc.type === "h") {
          const classe = bloc.niveau === 1 ? "text-lg font-semibold" : "font-semibold";
          return <p key={cle} className={classe}>{enLigne(bloc.texte, cle, setPhoto)}</p>;
        }
        if (bloc.type === "ul" || bloc.type === "ol") {
          const Liste = bloc.type === "ul" ? "ul" : "ol";
          return (
            <Liste key={cle} className={bloc.type === "ul" ? "list-disc space-y-1 pl-5" : "list-decimal space-y-1 pl-5"}>
              {bloc.items.map((item) => (
                <li key={item}>{enLigne(item, item, setPhoto)}</li>
              ))}
            </Liste>
          );
        }
        if (bloc.type === "table") {
          return (
            <div key={cle} className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {bloc.entetes.map((cellule) => (
                      <th key={cellule} className="border border-border px-2 py-1 text-left font-semibold">{cellule}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloc.lignes.map((ligne) => (
                    <tr key={ligne.join("|")}>
                      {ligne.map((cellule, rang) => (
                        <td key={`${rang}-${cellule}`} className="border border-border px-2 py-1">{enLigne(cellule, `${cle}-${rang}`, setPhoto)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (bloc.type === "quote") {
          return <blockquote key={cle} className="border-l-2 border-border pl-3 text-muted">{enLigne(bloc.texte, cle, setPhoto)}</blockquote>;
        }
        if (bloc.type === "p") return <p key={cle}>{enLigne(bloc.texte, cle, setPhoto)}</p>;
        return null;
      })}
      {photo ? (
        <dialog open className="fixed inset-0 z-50 grid h-full max-h-none w-full max-w-none place-items-center bg-black/70 p-6" onClick={() => setPhoto("")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={photo} className="max-h-[80dvh] max-w-full" />
          <button type="button" className="sr-only" onClick={() => setPhoto("")}>{t("assistant.fermer")}</button>
        </dialog>
      ) : null}
    </div>
  );
}
