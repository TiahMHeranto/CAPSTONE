export function journal(niveau: "info" | "warn", message: string, champs: Record<string, string | number> = {}) {
  const ligne = JSON.stringify({ niveau, message, ...champs, instant: new Date().toISOString() });
  if (niveau === "warn") console.warn(ligne);
  else console.info(ligne);
}
