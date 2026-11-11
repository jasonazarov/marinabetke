# Marina Betke: Webseite + Lead-CRM

Die komplette Seite von marinabetke.de (30 Seiten, alle Bilder, Video, Schriften,
Texte), dazu ein **Stepper** auf `/terminbuchung/` und dahinter **nur ein CRM**, das
die Anfragen sammelt. Hono + TypeScript auf Cloudflare Workers, D1-Datenbank,
serverseitig gerendertes HTML.

## Lokale Demo

Voraussetzung: Node.js 20 oder neuer (https://nodejs.org).

```bash
bash scripts/demo-lokal.sh
```

Beim ersten Start werden die Pakete installiert, 10 Beispiel-Leads eingespielt, und das
Skript fragt einmal nach dem CRM-Passwort (siehe „Login“). Danach öffnet sich der Browser:

| | |
|---|---|
| Webseite | http://localhost:8090/ |
| Stepper | http://localhost:8090/terminbuchung/ |
| CRM | http://localhost:8090/admin, `marinabetke@hypnose.com` + Passwort |

Was du im Stepper abschickst, steht sofort im CRM. Alles läuft nur auf deinem Rechner
(Datenbank unter `.wrangler/demo`), nichts wird veröffentlicht. Beenden mit Strg+C.
Demo-Datenbank zurücksetzen: `bash scripts/demo-lokal.sh --neu`, Passwort neu festlegen:
`bash scripts/demo-lokal.sh --passwort`.

## Login ins CRM

E-Mail **`marinabetke@hypnose.com`** (`ADMIN_LOGIN_EMAIL` in `wrangler.toml`) und das
vereinbarte Passwort, lokal wie live. **Das Passwort steht nirgends im Repo**, auch nicht als
Hash: Das Repo ist öffentlich, und ein Hash ließe sich offline durchprobieren.

- **Lokal:** `bash scripts/demo-lokal.sh` fragt beim ersten Start einmal danach und legt nur
  einen PBKDF2-Hash in `.dev.vars` ab (diese Datei ist in `.gitignore`).
- **Live:** einmalig `npx wrangler secret put ADMIN_PASSWORD` und das Passwort eintippen
  (Cloudflare speichert es verschlüsselt).

Falsche E-Mail oder falsches Passwort ergeben dieselbe Meldung. Nach 5 Fehlversuchen ist der
Login 15 Minuten gesperrt. Eine Sitzung hält 30 Tage.

## Aufbau

| Pfad | Was |
|---|---|
| `public/` | alle Seiten von marinabetke.de, statisch ausgeliefert |
| `src/templates/terminbuchung.html` | die Terminseite von marinabetke.de als Vorlage |
| `src/views/stepper.ts` | der Stepper (Markup), eingesetzt in die Vorlage |
| `public/assets/js/stepper.js` | Verhalten des Steppers |
| `public/assets/css/stepper.css` | Optik des Steppers (Marinas Farben und Schriften) |
| `src/lib/fragen.ts` | **eine** Quelle für Fragen, Antworten und CRM-Status |
| `src/lib/leads.ts` | Prüfen, Speichern, Lesen der Leads |
| `src/views/admin.ts`, `public/assets/css/crm.css` | das CRM unter `/admin` |
| `migrations/0001_crm.sql` | Tabellen: `leads`, `lead_events`, `sessions`, `login_attempts` |
| `scripts/test.mjs` | `npm test`: Prüfungen gegen einen echten lokalen Worker |
| `scripts/hellblau.mjs`, `styles/hellblau-extra.css` | erzeugen `public/assets/css/hellblau.css` |
| `scripts/demo-lokal.sh`, `scripts/demo-daten.sql` | lokale Demo mit Beispiel-Leads |

## Gestaltung: Hellblau

Die Seite ist hellblau gestaltet (Vorgabe: Hoffnung statt Nacht). Marinas Original-Stylesheet
`public/assets/css/style.css` bleibt unverändert; daraus erzeugt `node scripts/hellblau.mjs`
die Datei `public/assets/css/hellblau.css`, die alle Seiten laden:

- dunkle Flächen (Kopfzeile, Hero, Banner, „So arbeite ich“, Fußzeile) werden Hellblau,
  Text darauf wird dunkel, Kupfer wird Blau, je nach Rolle der Farbe (Hintergrund, Text,
  Rahmen, Schatten)
- was sich so nicht treffen lässt, steht von Hand in `styles/hellblau-extra.css`
  (Knöpfe, Glas-Kopfzeile, heller Schleier über dem Hero-Video und den Fotokarten)

Nach jeder Änderung an `style.css` oder `styles/hellblau-extra.css`:

```bash
node scripts/hellblau.mjs
```

Zurück zum Original: in den Seiten wieder `style.css` statt `hellblau.css` verlinken.

**Animationen bleiben:** das Hero-Video (Nebel über dem See, `scene-01-loop.mp4`, auf dem
Handy `scene-01-loop-m.mp4`), der langsame Zoom der Fotokarten, das Einblenden beim
Scrollen. Video und Sprachnachricht liefert der Worker in Teilstücken (Range), sonst spielt
Safari sie nicht ab (`run_worker_first` in `wrangler.toml`, `media()` in `src/index.ts`).

## Der Stepper

Eine Karte mit „Schritt n von 6 ·
Titel“, Punkte, Fortschrittsbalken, Antwort-Kacheln, Einzelauswahl springt von selbst
weiter, Zurück/Weiter, Ladebildschirm nach dem Absenden. Fragen, Texte und Optik von
marinabetke.de:

1. **Sicherheit**: akute Krise? „Ja“ zeigt sofort die Notrufnummern, es wird nichts gespeichert.
2. **Situation**: noch in der Beziehung / getrennt / mal so, mal so / anderes Thema
3. **Zeitpunkt**: mit Marinas Satz zur gewählten Situation darüber
4. **Rahmen**: die 3 Wege mit Preisen und Stefans Sprachnachricht. „Nein“ führt zum Klarheitsguide, nichts gespeichert.
5. **Erreichbarkeit**: vormittags / nachmittags / abends / egal. Ersetzt die Kalenderwahl der alten Seite.
6. **Kontakt**: Vorname, WhatsApp-Nummer mit Ländervorwahl, E-Mail (freiwillig), „Wodurch bist du auf mich gestoßen?“ (freiwillig), Einwilligung.

Die Zurück-Taste des Handys geht eine Frage zurück. `?q=<video>` im Link (z. B. aus den
Ratgeber-Artikeln) wird am Lead als Video-Kennung gespeichert.

## Das CRM (`/admin`)

Übersicht mit Kennzahlen, Pipeline (Neu → Kontaktiert → Termin vereinbart → Klient /
Kein Interesse), Grafik der letzten 30 Tage, Auswertung nach Situation, Herkunft und
Video. Liste mit Statusfilter und Suche (Name, Anfrage-Nr., Telefon, E-Mail; „/“
springt in die Suche). Je Lead: alle Antworten, WhatsApp mit vorbereiteter Nachricht,
Anrufen, E-Mail, Status, Notizen mit Verlauf, endgültig löschen. CSV-Export.

Login mit E-Mail und Passwort (siehe „Login ins CRM“). Optional eine Mail bei jeder neuen
Anfrage (Resend).

## Lokal entwickeln (ohne Beispiel-Leads)

```bash
npm install
```

```bash
node scripts/admin-passwort.mjs --dev-vars
```

```bash
npm run db:migrate:local
```

```bash
npm run dev
```

Dann http://localhost:8787/terminbuchung/ und http://localhost:8787/admin.

## Prüfen

```bash
npx tsc --noEmit
```

```bash
npm test
```

## Live schalten (einmalig, erst nach Freigabe)

```bash
npx wrangler d1 create marina-betke-crm
```

Die ausgegebene `database_id` in `wrangler.toml` eintragen, dann:

```bash
npx wrangler d1 migrations apply marina-betke-crm --remote
```

Das CRM-Passwort (E-Mail steht schon in `wrangler.toml`):

```bash
npx wrangler secret put ADMIN_PASSWORD
```

```bash
npx wrangler secret put IP_SALT
```

```bash
npx wrangler deploy
```

Optional Mail bei neuer Anfrage: `npx wrangler secret put RESEND_API_KEY` und in
`wrangler.toml` unter `[vars]` `ADMIN_EMAIL` und `MAIL_FROM` setzen.

Eigene Domain: in `wrangler.toml` den Block `[[routes]]` einkommentieren und
`workers_dev = false` setzen.

## Bildnachweis

Fotos von Unsplash, frei nutzbar unter der [Unsplash-Lizenz](https://unsplash.com/license):

- „23:14 Uhr“: Walter Martin, [Mann allein im Dunkeln mit Handy](https://unsplash.com/photos/a-man-sitting-in-a-dark-room-looking-at-his-cell-phone-VeoHVmfZvHw)
  (`chat-nacht-desktop.webp`, `chat-nacht-m.webp`)
- „Das stille Haus“: Vruyr Martirosyan, [leerer Stuhl am Fenster](https://unsplash.com/photos/empty-chair-near-window-AxZNLcEHNIs)
  (`stilles-haus-1100.webp`, `stilles-haus-m.webp`)

Alle übrigen Bilder stammen von marinabetke.de.

## Was gegenüber marinabetke.de anders ist

- **Cookie-Banner (CCM19) entfernt**: Der Schlüssel ist an marinabetke.de gebunden, und
  die Seite setzt keine Tracking-Cookies. Das CRM setzt nur ein technisch nötiges
  Login-Cookie für `/admin`.
- **Anonymer Seitenzähler und Fragebogen-Zählung entfernt** (liefen über PHP-Endpunkte
  von marinabetke.de).
- **Kundenstimmen-Skript entfernt**: Die Schnittstelle lieferte keine Stimmen, die
  Kästen bleiben wie bisher unsichtbar.
- **Terminkalender ersetzt** durch die Frage nach der Erreichbarkeit: Marina meldet sich
  per WhatsApp.
- **Alle Buchungs-Knöpfe heißen „Begleitung buchen“** (vorher „Gespräch anfragen“), auch der
  Absende-Knopf im Stepper. Knöpfe, die nur eine Programmbeschreibung öffnen („Programm
  ansehen“, „Alle Programme“), sind unverändert.
- **„23:14 Uhr“ als moderner Messenger-Chat** (`assets/css/chat.css`, Ablauf in
  `assets/js/chat.js`): „schreibt …“, ihre Nachricht kommt an, Antwort tippen, löschen, neu
  tippen, senden, blaue Haken. Dieselben Texte wie im Original.
- **Neue Fotos** für „23:14 Uhr“ und „Das stille Haus“ (siehe „Bildnachweis“).
- **Drei Texte im Abschnitt „Warum Verstehen allein nicht reicht“** neu formuliert.
- **Hellblau statt Nachtblau/Kupfer** (siehe „Gestaltung“). Das CRM unter `/admin` bleibt dunkel.

**Datenschutzerklärung anpassen, bevor die Seite unter eigener Domain live geht.** Der
Text ist unverändert übernommen und nennt noch CCM19, Strato als Hoster und die alte
Verarbeitung der Fragen. Neu sind: Hosting und Datenbank bei Cloudflare, Speicherung der
Anfragen im CRM, optional Mailversand über Resend. Die Einwilligung im Formular trägt
die Textfassung `2026-11-11` (`EINWILLIGUNG_VERSION` in `src/lib/fragen.ts`), sie wird
an jedem Lead gespeichert.
