export function FormattedText({ texte }: { texte: string }) {
  const propre = texte
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*|__|`|\|/g, "")
    .replace(/^\s*[-*]{3,}\s*$/gm, "")
    .replace(/\[(S?\d+)\]/g, "");
  const paragraphes = propre
    .split(/\n{2,}/)
    .map((bloc) => bloc.trim())
    .filter(Boolean);
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {paragraphes.map((bloc) => (
        <p key={bloc.slice(0, 40)}>{bloc}</p>
      ))}
    </div>
  );
}
