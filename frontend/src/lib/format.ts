export function montant(valeur: number, devise: string): string {
  const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(valeur);
  if (!devise) return nombre;
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: devise,
      maximumFractionDigits: 0,
    }).format(valeur);
  } catch {
    return `${nombre} ${devise}`;
  }
}

export function score(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valeur);
}

export function dateCourte(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur.slice(0, 10);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
