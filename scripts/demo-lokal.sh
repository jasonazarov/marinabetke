#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Lokale Demo: Webseite, Stepper und CRM auf dem eigenen Rechner.
#
#   bash scripts/demo-lokal.sh          starten (Beispiel-Leads beim ersten Mal)
#   bash scripts/demo-lokal.sh --neu    Demo-Datenbank leeren und neu befüllen
#
# Läuft komplett lokal: eigene Datenbank unter .wrangler/demo, nichts geht ins
# Internet, nichts wird veröffentlicht. Beenden mit Strg+C.
#
#   PORT=9000 bash scripts/demo-lokal.sh            anderer Port (Standard 8090)
#   DEMO_PASSWORT=geheim bash scripts/demo-lokal.sh anderes CRM-Passwort (Standard demo)
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8090}"
PASSWORT="${DEMO_PASSWORT:-demo}"
DATEN=".wrangler/demo"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte Node.js 20 oder neuer installieren: https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js $NODE_MAJOR ist zu alt, bitte Version 20 oder neuer installieren." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "▸ Pakete installieren (nur beim ersten Mal) …"
  npm install --no-audit --no-fund
fi

if [ "${1:-}" = "--neu" ]; then
  echo "▸ Demo-Datenbank leeren …"
  rm -rf "$DATEN"
fi

NEU=0
[ -d "$DATEN" ] || NEU=1

echo "▸ Datenbank vorbereiten …"
npx wrangler d1 migrations apply marina-betke-crm --local --persist-to "$DATEN" </dev/null >/dev/null

if [ "$NEU" = 1 ]; then
  echo "▸ Beispiel-Leads einspielen …"
  npx wrangler d1 execute marina-betke-crm --local --persist-to "$DATEN" --file scripts/demo-daten.sql </dev/null >/dev/null
fi

cat <<EOF

  ┌──────────────────────────────────────────────────────────────┐
    Marina Betke · lokale Demo

    Webseite      http://localhost:$PORT/
    Stepper       http://localhost:$PORT/terminbuchung/
    CRM           http://localhost:$PORT/admin
    Passwort      $PASSWORT

    Was du im Stepper abschickst, steht sofort im CRM.
    Beenden mit Strg+C.
  └──────────────────────────────────────────────────────────────┘

EOF

# Browser öffnen, sobald die Seite antwortet (macOS: open, Linux: xdg-open).
(
  for _ in $(seq 1 60); do
    if curl -fs -o /dev/null "http://localhost:$PORT/robots.txt" 2>/dev/null; then
      if command -v open >/dev/null 2>&1; then open "http://localhost:$PORT/terminbuchung/"
      elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$PORT/terminbuchung/" >/dev/null 2>&1
      fi
      break
    fi
    sleep 1
  done
) &

exec npx wrangler dev --port "$PORT" --persist-to "$DATEN" \
  --var "ADMIN_PASSWORD:$PASSWORT" --var "IP_SALT:demo" --var "LEADS_PER_HOUR:1000" --log-level warn
