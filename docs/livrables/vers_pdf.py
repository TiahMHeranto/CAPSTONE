"""Convertit les Markdown de ce dossier en PDF via Edge."""

from pathlib import Path
import subprocess

import markdown

ICI = Path(__file__).resolve().parent
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
HTML = ICI / "_html"

STYLE = """
@page { size: A4; margin: 16mm 16mm 18mm 16mm; }
html { font-family: "Segoe UI", sans-serif; font-size: 11pt; color: #1c2430; }
body { margin: 0; }
h1 { font-size: 20pt; color: #0c5c5c; margin: 0 0 0.6em; }
h2 { font-size: 14pt; color: #0c5c5c; margin: 1.3em 0 0.4em; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 1em 0 0.3em; page-break-after: avoid; }
p, li { line-height: 1.45; }
table { border-collapse: collapse; width: 100%; margin: 0.6em 0 1em; page-break-inside: avoid; }
th, td { border: 1px solid #c5cdd6; padding: 4px 6px; vertical-align: top; text-align: left; }
th { background: #e7f3f2; }
code { font-family: Consolas, monospace; font-size: 9.5pt; background: #f3f5f7; }
pre { background: #f3f5f7; padding: 8px 10px; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: transparent; }
hr { border: 0; border-top: 1px solid #c5cdd6; margin: 1.2em 0; }
a { color: #0c5c5c; }
"""


def convertir(source: Path) -> None:
    corps = markdown.markdown(
        source.read_text(encoding="utf-8"),
        extensions=["tables", "fenced_code", "sane_lists"],
    )
    page = f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>{source.stem}</title>
<style>{STYLE}</style>
</head>
<body>
<p style="letter-spacing:.04em;color:#5c6b7a;font-size:9pt;margin:0 0 1em">PREDICARE TPA</p>
{corps}
</body>
</html>
"""
    HTML.mkdir(exist_ok=True)
    html = HTML / f"{source.stem}.html"
    pdf = ICI / f"{source.stem}.pdf"
    html.write_text(page, encoding="utf-8")
    adresse = html.as_uri()
    commande = [
        str(EDGE),
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf}",
        adresse,
    ]
    resultat = subprocess.run(commande, check=False, capture_output=True, text=True)
    if resultat.returncode != 0 or not pdf.exists():
        raise SystemExit(resultat.stderr or resultat.stdout or f"echec {source.name}")
    print(pdf.name)


def main() -> None:
    if not EDGE.exists():
        raise SystemExit("Edge introuvable")
    for source in sorted(ICI.glob("*.md")):
        convertir(source)


if __name__ == "__main__":
    main()
