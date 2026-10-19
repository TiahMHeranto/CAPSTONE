import messages from "@/i18n/fr.json";

export function t(cle: string): string {
  const morceaux = cle.split(".");
  let courant: unknown = messages;
  for (const morceau of morceaux) {
    if (typeof courant !== "object" || courant === null || !(morceau in courant)) return cle;
    courant = (courant as Record<string, unknown>)[morceau];
  }
  return typeof courant === "string" ? courant : cle;
}

export function messageErreur(data: Record<string, unknown>): string {
  const rejets = data.rejets;
  if (Array.isArray(rejets) && rejets[0] && typeof rejets[0] === "object") {
    const code = String((rejets[0] as { code?: string }).code ?? "");
    const traduit = t(`erreurs.${code}`);
    if (traduit !== `erreurs.${code}`) return traduit;
  }
  const code = String(data.code ?? "");
  const traduit = t(`erreurs.${code}`);
  if (code && traduit !== `erreurs.${code}`) return traduit;
  return t("erreurs.generique");
}
