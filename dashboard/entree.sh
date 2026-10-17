#!/usr/bin/env bash
set -euo pipefail

superset db upgrade

if ! superset fab list-users | grep -qw "${SUPERSET_ADMIN_USERNAME}"; then
  superset fab create-admin \
    --username "${SUPERSET_ADMIN_USERNAME}" \
    --firstname PrediCare \
    --lastname Admin \
    --email "${SUPERSET_ADMIN_EMAIL}" \
    --password "${SUPERSET_ADMIN_PASSWORD}"
fi

superset init
python /app/pythonpath/brancher_bi.py
exec /usr/bin/run-server.sh
