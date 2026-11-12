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
  Passwort als Secret (`npx wrangler secret put ADMIN_PASSWORD`). Zum Vorführen (Vorgabe des
  Auftraggebers: leichter Zugang) öffnet in der lokalen Demo `http://localhost:8090/admin` das
  Dashboard ohne Passwort: nur mit `LOCAL_DEMO=1` (setzt allein `scripts/demo-lokal.sh`) UND
  Aufruf auf dem eigenen Rechner (`localhost`, `127.0.0.1`). `LOCAL_DEMO` NIE live setzen.
- **Hero-Video „Atem“** (Vorgabe des Auftraggebers): `public/assets/images/hero-atem*.mp4`
  (Kampus Production, Pexels). Alle Links auf die Programmübersicht zeigen auf
  `/programme/#programme` (springen direkt zu den Karten).
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
