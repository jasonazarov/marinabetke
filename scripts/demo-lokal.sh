#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Lokale Demo: Webseite, Stepper und CRM auf dem eigenen Rechner.
#
#   bash scripts/demo-lokal.sh              starten (Beispiel-Leads beim ersten Mal)
#   bash scripts/demo-lokal.sh --neu        Demo-Datenbank leeren und neu befüllen
#   bash scripts/demo-lokal.sh --passwort   CRM-Passwort neu festlegen
#
# CRM-Login: die E-Mail aus wrangler.toml (ADMIN_LOGIN_EMAIL) und das Passwort,
# nach dem das Skript beim ersten Start einmal fragt. Gespeichert wird nur sein
# Hash, in .dev.vars auf diesem Rechner (nicht im Repo).
# Zum Vorführen öffnet http://localhost:8090/admin das Dashboard sofort, ohne
# Passwort (LOCAL_DEMO, nur unter localhost, live nie). Den echten Login zeigt
# man nach „Abmelden“. Eine alte Login-Sperre hebt jeder Start auf.
#
# Läuft komplett lokal: eigene Datenbank unter .wrangler/demo, nichts geht ins
# Internet, nichts wird veröffentlicht. Beenden mit Strg+C.
#
#   PORT=9000 bash scripts/demo-lokal.sh   anderer Port (Standard 8090)
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8090}"
DATEN=".wrangler/demo"
NEU_DB=0
NEU_PW=0
for arg in "$@"; do
  case "$arg" in
    --neu) NEU_DB=1 ;;
    --passwort) NEU_PW=1 ;;
    *) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte Node.js 20 oder neuer installieren: https://nodejs.org" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js $NODE_MAJOR ist zu alt, bitte Version 20 oder neuer installieren." >&2
  exit 1
fi

# Läuft auf dem Port schon eine (alte) Demo, zeigt der Browser deren Stand statt des neuen.
if curl -fs -o /dev/null --max-time 2 "http://localhost:$PORT/robots.txt" 2>/dev/null; then
  cat >&2 <<EOF

  Auf Port $PORT läuft schon eine Demo, wahrscheinlich in einem anderen Terminal-Fenster.
  Dort mit Strg+C beenden und dieses Skript dann neu starten, sonst siehst du den alten Stand.

EOF
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "▸ Pakete installieren (nur beim ersten Mal) …"
  npm install --no-audit --no-fund
fi

# Neue Pakete nach einem git pull (package-lock.json neuer als node_modules)
if [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "▸ Pakete aktualisieren …"
  npm install --no-audit --no-fund
fi

LOGIN_EMAIL="$(sed -n 's/^ADMIN_LOGIN_EMAIL *= *"\(.*\)"/\1/p' wrangler.toml)"

# CRM-Passwort: einmal abfragen, nur den Hash lokal ablegen.
if [ "$NEU_PW" = 1 ] || ! grep -q '^ADMIN_PASSWORD_HASH=' .dev.vars 2>/dev/null; then
  echo "▸ CRM-Login einrichten (nur einmal, bleibt auf diesem Rechner)"
  echo "  E-Mail:   $LOGIN_EMAIL"
  if [ -n "${DEMO_PASSWORT:-}" ]; then
    ADMIN_PASSWORT="$DEMO_PASSWORT" node scripts/admin-passwort.mjs --dev-vars
  else
    node scripts/admin-passwort.mjs --dev-vars
  fi
fi

if [ "$NEU_DB" = 1 ] && [ -d "$DATEN" ]; then
  echo "▸ Demo-Datenbank leeren …"
  rm -r -- "$DATEN"
fi

NEU=0
[ -d "$DATEN" ] || NEU=1

echo "▸ Datenbank vorbereiten …"
npx wrangler d1 migrations apply marina-betke-crm --local --persist-to "$DATEN" </dev/null >/dev/null

if [ "$NEU" = 1 ]; then
  echo "▸ Beispiel-Leads einspielen …"
  npx wrangler d1 execute marina-betke-crm --local --persist-to "$DATEN" --file scripts/demo-daten.sql </dev/null >/dev/null
fi

# Eine Login-Sperre aus einer früheren Vorführung (5 Fehlversuche) gilt nicht weiter.
npx wrangler d1 execute marina-betke-crm --local --persist-to "$DATEN" --command "DELETE FROM login_attempts" </dev/null >/dev/null

CRM="http://localhost:$PORT/admin"

cat <<EOF

  ┌──────────────────────────────────────────────────────────────────────┐
    Marina Betke · lokale Demo

    Webseite      http://localhost:$PORT/
    Stepper       http://localhost:$PORT/terminbuchung/
    Dashboard     $CRM
                  öffnet sich in der Demo sofort, ohne Passwort
                  (immer dieselbe Adresse, gern als Lesezeichen)

    Echten Login vorführen: im Dashboard „Abmelden“, dann
                  $LOGIN_EMAIL + dein Passwort

    Was du im Stepper abschickst, steht sofort im Dashboard.
    Beenden mit Strg+C.
  └──────────────────────────────────────────────────────────────────────┘

EOF

# Browser öffnen, sobald die Seite antwortet: Stepper und Dashboard (macOS: open, Linux: xdg-open).
(
  for _ in $(seq 1 60); do
    if curl -fs -o /dev/null "http://localhost:$PORT/robots.txt" 2>/dev/null; then
      for url in "http://localhost:$PORT/terminbuchung/" "$CRM"; do
        if command -v open >/dev/null 2>&1; then open "$url"
        elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url" >/dev/null 2>&1
        fi
        sleep 1
      done
      break
    fi
    sleep 1
  done
) &

exec npx wrangler dev --port "$PORT" --persist-to "$DATEN" \
  --var "IP_SALT:demo" --var "LEADS_PER_HOUR:1000" --var "LOCAL_DEMO:1" --log-level warn
