# Marina Betke: Regeln für dieses Repo

- **Eigenständiges Projekt.** Dieses Repo hat nichts mit Nikki Media zu tun: kein Code,
  kein Deploy, keine Datenbank und kein Branch in einem Nikki-Media-Repo. Änderungen
  für Marina Betke passieren nur hier.
- **Nichts wird ohne ausdrückliche Freigabe veröffentlicht.** Kein `wrangler deploy`,
  kein Anlegen von Datenbanken oder Secrets bei Cloudflare, solange der Auftraggeber das
  nicht ausdrücklich sagt. Gezeigt wird über die lokale Demo.
- **Lokale Demo:** `bash scripts/demo-lokal.sh` → http://localhost:8090 (CRM unter
  `/admin`). `--neu` setzt die Demo-Datenbank zurück, `--passwort` das CRM-Passwort.
- **CRM-Login** (Vorgabe des Auftraggebers): E-Mail `marinabetke@hypnose.com`
  (`ADMIN_LOGIN_EMAIL` in `wrangler.toml`) + Passwort. Das Repo ist öffentlich: das Passwort
  und sein Hash kommen NIE ins Repo. Lokal liegt nur der Hash in `.dev.vars`, live das
  Passwort als Secret (`npx wrangler secret put ADMIN_PASSWORD`). Zum Vorführen öffnet die
  Demo das Dashboard über den Einmal-Link „CRM direkt“ (`/admin/demo/<token>`, nur localhost,
  `DEMO_LOGIN_TOKEN` setzt allein `scripts/demo-lokal.sh`). Diesen Wert NIE live setzen.
- **Buchungs-Knöpfe heißen „Begleitung buchen“** (Vorgabe des Auftraggebers), überall.
- **Vor jedem Commit:** `npx tsc --noEmit` und `npm test` (startet einen lokalen Worker
  mit eigener Datenbank, alle Prüfungen müssen grün sein).
- **Fragen und Antworten des Steppers** stehen nur in `src/lib/fragen.ts`: Formular,
  Prüfung auf dem Server und Anzeige im CRM lesen dieselbe Liste.
- **Datenschutzerklärung** (`public/datenschutz/`) ist noch der alte Text von
  marinabetke.de und muss vor einem Livegang angepasst werden (siehe README).
- **Gestaltung Hellblau** (Vorgabe des Auftraggebers: Hoffnung): Seiten laden
  `public/assets/css/hellblau.css`, erzeugt von `node scripts/hellblau.mjs` aus dem
  unveränderten Original `style.css` plus `styles/hellblau-extra.css`. Nie hellblau.css von
  Hand ändern. Die Animationen (Hero-Video, Zoom der Fotokarten) müssen bleiben.
