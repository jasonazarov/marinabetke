# Marina Betke: Regeln für dieses Repo

- **Eigenständiges Projekt.** Dieses Repo hat nichts mit Nikki Media zu tun: kein Code,
  kein Deploy, keine Datenbank und kein Branch in einem Nikki-Media-Repo. Änderungen
  für Marina Betke passieren nur hier.
- **Nichts wird ohne ausdrückliche Freigabe veröffentlicht.** Kein `wrangler deploy`,
  kein Anlegen von Datenbanken oder Secrets bei Cloudflare, solange der Auftraggeber das
  nicht ausdrücklich sagt. Gezeigt wird über die lokale Demo.
- **Lokale Demo:** `bash scripts/demo-lokal.sh` → http://localhost:8090 (CRM unter
  `/admin`, Passwort `demo`). `--neu` setzt die Demo-Datenbank zurück.
- **Vor jedem Commit:** `npx tsc --noEmit` und `npm test` (startet einen lokalen Worker
  mit eigener Datenbank, alle Prüfungen müssen grün sein).
- **Fragen und Antworten des Steppers** stehen nur in `src/lib/fragen.ts`: Formular,
  Prüfung auf dem Server und Anzeige im CRM lesen dieselbe Liste.
- **Datenschutzerklärung** (`public/datenschutz/`) ist noch der alte Text von
  marinabetke.de und muss vor einem Livegang angepasst werden (siehe README).
