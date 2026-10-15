#!/bin/sh
# Restaure une sauvegarde. Sans second argument, la base qui sert l'API est remplacée.
# Avec un second argument, la restauration se fait dans une autre base, laissée intacte sinon.
set -eu
infile="${1:-/backup/prediccare.dump}"
cible="${2:-$POSTGRES_DB}"
case "$cible" in
  *[!a-z0-9_]*)
    echo "nom de base refuse"
    exit 1
    ;;
esac
if [ ! -f "$infile" ]; then
  echo "sauvegarde introuvable: $infile"
  exit 1
fi
if [ "$cible" = "$POSTGRES_DB" ]; then
  pg_restore -U "$POSTGRES_USER" -d "$cible" --clean --if-exists --no-owner "$infile"
else
  existe=$(psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$cible'")
  if [ "$existe" != "1" ]; then
    createdb -U "$POSTGRES_USER" "$cible"
  fi
  pg_restore -U "$POSTGRES_USER" -d "$cible" --no-owner --exit-on-error "$infile"
fi
echo "restauration terminee: $infile -> $cible"
