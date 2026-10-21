export const MOTIFS = {
  valider: ["PIECES_CONFORMES", "CONTROLE_FAVORABLE", "TARIF_CONFORME", "ORDONNANCE_VALIDE"],
  rejeter: [
    "CONTROLE_MEDICAL",
    "PIECE_MANQUANTE_ATTESTATION",
    "ORDONNANCE_PERIMEE",
    "DELAI_DE_CARENCE",
    "HORS_PERIODE_COUVERTURE",
    "PLAFOND_ATTEINT",
    "ENTENTE_PREALABLE_ABSENTE",
    "PRODUIT_NON_REMBOURSABLE",
  ],
  complement: ["ORDONNANCE_MANQUANTE", "ATTESTATION_MANQUANTE", "PIECE_ILLISIBLE"],
} as const;

export type DecisionCode = keyof typeof MOTIFS;

export function motifTexte(motif: string, traduire: (cle: string) => string): string {
  for (const action of Object.keys(MOTIFS) as DecisionCode[]) {
    const cle = `motifs.${action}.${motif}`;
    const traduit = traduire(cle);
    if (traduit !== cle) return traduit;
  }
  return motif;
}
