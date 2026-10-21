export type Source = { source?: string; page?: number | null };
export type Avis = "" | "utile" | "inutile";
export type EtatEnvoi = "envoi" | "envoye" | "erreur" | "file";
export type CodeErreur = "" | "reseau" | "indisponible" | "hors" | "limite" | "delai" | "generique" | "interrompu";

export type Piece = { nom: string; apercu?: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  texte: string;
  sources: Source[];
  sansSource: boolean;
  raisonnement: string;
  creeLe: number;
  etat: EtatEnvoi;
  avis: Avis;
  avisTexte: string;
  erreur: CodeErreur;
  pieces: Piece[];
};

export type Fil = {
  id: string;
  titre: string;
  epingle: boolean;
  archive: boolean;
  messages: Message[];
  maj: number;
};

const CLE_BASE = "prediccare.assistant.fils";
const BROUILLON_BASE = "prediccare.assistant.brouillon";
const SON = "prediccare.assistant.son";
export const TITRE_NEUF = "Nouvelle conversation";
export const LIMITE = 2000;

// Les fils et brouillons sont isolés par compte : deux comptes connectés sur le
// même navigateur n'ont jamais le même historique. `identifiant` vient du jeton
// de session (jamais du corps d'une requête).
function cleFils(identifiant: string): string {
  return `${CLE_BASE}.${identifiant || "anonyme"}`;
}

function cleBrouillon(identifiant: string, id: string): string {
  return `${BROUILLON_BASE}.${identifiant || "anonyme"}.${id}`;
}

export function identifiant(): string {
  return crypto.randomUUID();
}

export function creerFil(): Fil {
  return {
    id: identifiant(),
    titre: TITRE_NEUF,
    epingle: false,
    archive: false,
    messages: [],
    maj: Date.now(),
  };
}

export function messageVide(role: Message["role"], texte: string): Message {
  return {
    id: identifiant(),
    role,
    texte,
    sources: [],
    sansSource: false,
    raisonnement: "",
    creeLe: Date.now(),
    etat: "envoye",
    avis: "",
    avisTexte: "",
    erreur: "",
    pieces: [],
  };
}

function filValide(valeur: unknown): valeur is Fil {
  if (!valeur || typeof valeur !== "object") return false;
  const fil = valeur as Fil;
  return typeof fil.id === "string" && typeof fil.titre === "string" && Array.isArray(fil.messages);
}

export function lireFils(identifiant: string): Fil[] {
  try {
    const brut = localStorage.getItem(cleFils(identifiant));
    if (!brut) return [];
    const liste = JSON.parse(brut) as unknown;
    if (!Array.isArray(liste)) return [];
    return liste.filter(filValide).map((fil) => ({
      ...fil,
      epingle: Boolean(fil.epingle),
      archive: Boolean(fil.archive),
      maj: Number(fil.maj) || 0,
      messages: fil.messages.filter((message) => message && typeof message.texte === "string" && (message.role === "user" || message.role === "assistant")),
    }));
  } catch {
    return [];
  }
}

export function ecrireFils(identifiant: string, fils: Fil[]): void {
  localStorage.setItem(cleFils(identifiant), JSON.stringify(fils));
}

export function lireBrouillon(identifiant: string, id: string): string {
  return localStorage.getItem(cleBrouillon(identifiant, id)) ?? "";
}

export function ecrireBrouillon(identifiant: string, id: string, texte: string): void {
  const cle = cleBrouillon(identifiant, id);
  if (!texte) localStorage.removeItem(cle);
  else localStorage.setItem(cle, texte);
}

export function lireSon(): boolean {
  return localStorage.getItem(SON) === "1";
}

export function ecrireSon(actif: boolean): void {
  localStorage.setItem(SON, actif ? "1" : "0");
}

export function titreDepuis(texte: string): string {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (propre.length <= 48) return propre || TITRE_NEUF;
  return `${propre.slice(0, 47)}…`;
}

export function versMarkdown(fil: Fil): string {
  const lignes = [`# ${fil.titre}`, ""];
  for (const message of fil.messages) {
    const qui = message.role === "user" ? "Vous" : "Assistant";
    const quand = new Date(message.creeLe).toLocaleString("fr-FR");
    lignes.push(`**${qui}** — ${quand}`, "", message.texte || "", "");
    if (message.sources.length) {
      lignes.push(
        "Sources :",
        ...message.sources.map((source) => `- ${source.source ?? "document"}${source.page ? ` p. ${source.page}` : ""}`),
        "",
      );
    }
  }
  return lignes.join("\n");
}
