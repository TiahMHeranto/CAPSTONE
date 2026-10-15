#!/bin/sh
# Sauvegarde quotidienne : fichier daté et copie prediccare.dump.
set -eu
stamp=$(date -u +%Y%m%d)
outdir=/backup
outfile="${1:-$outdir/prediccare-$stamp.dump}"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner -f "$outfile"
cp -f "$outfile" "$outdir/prediccare.dump"
echo "sauvegarde ecrite: $outfile"
