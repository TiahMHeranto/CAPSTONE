export function nomAffiche(profil: Record<string, unknown>): string {
  const nom = profil.nom;
  if (typeof nom === "string" && nom.trim()) return nom.trim();
  if (nom && typeof nom === "object") {
    const fiche = nom as Record<string, unknown>;
    const complet = [fiche.prenoms, fiche.nom].filter((part) => typeof part === "string" && part).join(" ");
    if (complet) return complet;
  }
  return "";
}

export function prenomAffiche(profil: Record<string, unknown>): string {
  const nom = profil.nom;
  if (nom && typeof nom === "object") {
    const prenoms = (nom as Record<string, unknown>).prenoms;
    if (typeof prenoms === "string" && prenoms.trim()) return prenoms.trim().split(/\s+/)[0];
  }
  const complet = nomAffiche(profil);
  return complet.split(/\s+/)[0] ?? "";
}

export function initiales(nom: string): string {
  const lettres = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? "");
  return lettres.join("") || "•";
}
