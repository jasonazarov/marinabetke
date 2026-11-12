#!/usr/bin/env node
/**
 * Prüft Webseite, Stepper-API und CRM einmal komplett gegen einen echten
 * lokalen Worker mit eigener, leerer Datenbank (nichts davon ist live).
 *
 *   npm test
 *
 * Startet `wrangler dev` auf Port 8799 mit einem eigenen Datenordner, spielt
 * die Migrationen ein, geht alle Prüfungen durch und räumt danach auf.
 */
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './admin-passwort.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 8799
const BASE = `http://127.0.0.1:${PORT}`
const PW = 'test-passwort-' + Math.random().toString(36).slice(2)
const EMAIL = 'test-login@example.com'
const DEMO_TOKEN = 'demo-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
const persist = mkdtempSync(join(tmpdir(), 'marina-crm-test-'))

let failed = 0
let passed = 0
const check = (name, ok, detail = '') => {
  if (ok) passed++
  else failed++
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok || !detail ? '' : `  → ${detail}`}`)
}

const wrangler = (args, opts = {}) => execFileSync('npx', ['wrangler', ...args], { cwd: ROOT, stdio: 'pipe', ...opts })

// Läuft auf dem Port schon etwas (z. B. ein hängengebliebener Lauf), würden die
// Prüfungen gegen den falschen Worker gehen. Dann lieber gleich abbrechen.
try {
  await fetch(BASE + '/robots.txt', { signal: AbortSignal.timeout(1500) })
  console.error(`Port ${PORT} ist belegt. Bitte den Prozess dort beenden und neu starten.`)
  process.exit(1)
} catch {}

console.log('Datenbank anlegen …')
wrangler(['d1', 'migrations', 'apply', 'marina-betke-crm', '--local', '--persist-to', persist])

console.log('Worker starten …')
// Eigene Prozessgruppe: So endet beim Aufräumen auch der Worker unter npx/wrangler.
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', persist, '--var', `ADMIN_LOGIN_EMAIL:${EMAIL}`, '--var', `ADMIN_PASSWORD_HASH:${hashPassword(PW)}`, '--var', 'IP_SALT:test', '--var', `DEMO_LOGIN_TOKEN:${DEMO_TOKEN}`], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
})
let log = ''
dev.stdout.on('data', (d) => (log += d))
dev.stderr.on('data', (d) => (log += d))

const stop = () => {
  try { process.kill(-dev.pid, 'SIGTERM') } catch { dev.kill('SIGTERM') }
  try { rmSync(persist, { recursive: true, force: true }) } catch {}
}
process.on('SIGINT', () => { stop(); process.exit(130) })

async function ready() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(BASE + '/robots.txt')
      if (r.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Worker startet nicht:\n' + log.slice(-2000))
}

const H = { 'Content-Type': 'application/json', Origin: BASE }
const lead = (over = {}) => ({
  krise: 'nein', situation: 'getrennt', start: 'sofort', budget: 'ja', erreichbar: 'abends',
  vorname: 'Testmann', vorwahl: '49', telefon: '0151 2345678' + Math.floor(Math.random() * 10), email: '', woher: 'instagram',
  quelle: 'gaslighting', einwilligung: true, website: '', ...over,
})
const post = (body, headers = H) => fetch(BASE + '/api/leads', { method: 'POST', headers, body: JSON.stringify(body) })

let cookie = ''
const admin = (path, init = {}) =>
  fetch(BASE + path, { redirect: 'manual', ...init, headers: { Cookie: cookie, ...(init.headers || {}) } })
const form = (data) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE },
  body: new URLSearchParams(data).toString(),
})

try {
  await ready()

  console.log('\nWebseite')
  for (const p of ['/', '/preise/', '/programme/', '/ratgeber/', '/impressum/', '/datenschutz/']) {
    const r = await fetch(BASE + p, { redirect: 'manual' })
    check(`${p} liefert 200`, r.status === 200, String(r.status))
  }
  const tb = await fetch(BASE + '/terminbuchung/')
  const tbHtml = await tb.text()
  check('/terminbuchung/ liefert 200', tb.status === 200, String(tb.status))
  check('Stepper steht auf der Seite (#fragen, 6 Schritte)', tbHtml.includes('id="fragen"') && (tbHtml.match(/data-panel="/g) || []).length === 6)
  check('stepper.js und stepper.css sind eingebunden', tbHtml.includes('/assets/js/stepper.js') && tbHtml.includes('/assets/css/stepper.css'))
  const noSlash = await fetch(BASE + '/terminbuchung?q=x', { redirect: 'manual' })
  check('/terminbuchung leitet auf /terminbuchung/ um (mit ?q=)', noSlash.status === 301 && noSlash.headers.get('location').endsWith('/terminbuchung/?q=x'))
  const unknown = await fetch(BASE + '/gibt-es-nicht/', { redirect: 'manual' })
  check('Unbekannte Seite führt zur Startseite', unknown.status === 301)

  console.log('\nHellblau und Animation')
  let gen = true
  try { execFileSync('node', ['scripts/hellblau.mjs', '--check'], { cwd: ROOT, stdio: 'pipe' }) } catch { gen = false }
  check('hellblau.css ist aus style.css + styles/hellblau-extra.css erzeugt und aktuell', gen)
  const home = await (await fetch(BASE + '/')).text()
  check('Startseite und Terminseite laden hellblau.css (nicht das Original)', home.includes('/assets/css/hellblau.css') && !home.includes('/assets/css/style.css') && tbHtml.includes('/assets/css/hellblau.css'))
  check('Hero-Video ist eingebunden (Desktop und Handy, absolute Pfade)', home.includes('data-src="/assets/images/scene-01-loop.mp4"') && home.includes('data-src-m="/assets/images/scene-01-loop-m.mp4"'))
  for (const f of ['/assets/images/scene-01-loop.mp4', '/assets/images/scene-01-loop-m.mp4', '/assets/audio/sprachnachricht-klient.m4a']) {
    const part = await fetch(BASE + f, { headers: { Range: 'bytes=0-99' } })
    check(`${f.split('/').pop()} liefert Teilstücke (206, für Safari)`, part.status === 206 && /^bytes 0-99\//.test(part.headers.get('content-range') || '') && (await part.arrayBuffer()).byteLength === 100, String(part.status))
  }

  console.log('\nInhalte, Knöpfe und Chat')
  check('Neue Texte im Abschnitt „Warum Verstehen allein nicht reicht“',
    home.includes('Du hast dich dir selbst entfremdet, du erkennst dich nicht wieder') &&
    home.includes('im Unterbewusstsein, ein Loch, das sich derzeit nicht zu bessern scheint') &&
    home.includes('Nach außen scheinst du zu funktionieren') && !home.includes('Nach außen funktionierst du'))
  check('Neue Texte im Abschnitt „Worauf wir hinarbeiten“',
    home.includes('an dem der Gedanke an sie dich den ganzen Abend unberührt lässt. Das Gefühlsgefängnis') &&
    home.includes('Du findest wieder zu dir, nur stärker.') && !home.includes('Du vertraust deinem eigenen Urteil'))
  const prog = await (await fetch(BASE + '/programme/')).text()
  check('Menüpunkt „Programme“ springt zu den Programmkarten (#programme)',
    home.includes('<a href="/programme/#programme">Programme</a>') && !home.includes('<a href="/programme/">Programme</a>') &&
    tbHtml.includes('<a href="/programme/#programme">Programme</a>') && prog.includes('<section id="programme"'))
  const btnTexts = (html) => [...html.matchAll(/<a\b[^>]*class="[^"]*\b(?:btn|wa-float)\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim())
  const homeBtns = btnTexts(home)
  check('Buchungs-Knöpfe heißen „Begleitung buchen“, keiner mehr „Gespräch anfragen“',
    homeBtns.filter((t) => t === 'Begleitung buchen').length >= 5 && !homeBtns.some((t) => /Gespräch/.test(t)) && !btnTexts(tbHtml).some((t) => /Gespräch/.test(t)))
  check('Absende-Knopf im Stepper: „Begleitung buchen“', /data-submit-text>Begleitung buchen</.test(tbHtml))
  check('„23:14 Uhr“ als Messenger-Chat mit denselben Texten', home.includes('data-chat="type"') && home.includes('Können wir reden?') && home.includes('/assets/css/chat.css'))
  for (const f of ['/assets/images/chat-nacht-desktop.webp', '/assets/images/chat-nacht-m.webp', '/assets/images/stilles-haus-1100.webp', '/assets/images/stilles-haus-m.webp', '/assets/css/chat.css']) {
    const res = await fetch(BASE + f)
    check(`${f.split('/').pop()} wird ausgeliefert`, res.status === 200, String(res.status))
  }
  const css = await (await fetch(BASE + '/assets/css/hellblau.css')).text()
  check('Fotokarten nutzen die neuen Bilder', css.includes('chat-nacht-desktop.webp') && css.includes('stilles-haus-1100.webp'))

  console.log('\nAnfrage speichern (POST /api/leads)')
  const first = lead({ vorname: 'Stefan', telefon: '0151 23456789', email: 'Stefan@Example.de' })
  let r = await post(first)
  let d = await r.json()
  check('Gültige Anfrage wird gespeichert', r.status === 200 && d.ok && /^\d{6}$/.test(d.nr), JSON.stringify(d))
  check('Telefon wird mit Vorwahl, ohne führende 0 gespeichert', d.telefon === '+49 151 23456789', d.telefon)
  const nr = d.nr
  r = await post(first)
  d = await r.json()
  check('Doppelt abgeschickt ergibt dieselbe Nummer', d.ok && d.nr === nr, JSON.stringify(d))

  const reject = async (name, body, field, status = 400, headers = H) => {
    const res = await post(body, headers)
    const j = await res.json().catch(() => ({}))
    check(name, res.status === status && (!field || j.field === field), `${res.status} ${JSON.stringify(j)}`)
  }
  await reject('Krise „Ja“ ergibt keinen Lead', lead({ krise: 'ja' }), 'krise')
  await reject('Budget „Nein“ ergibt keinen Lead', lead({ budget: 'nein' }), 'fragen')
  await reject('Unbekannte Antwort wird abgewiesen', lead({ situation: '<script>' }), 'fragen')
  await reject('Ohne Erreichbarkeit abgewiesen', lead({ erreichbar: '' }), 'erreichbar')
  await reject('Ohne Vornamen abgewiesen', lead({ vorname: '  ' }), 'vorname')
  await reject('Zu kurze Nummer abgewiesen', lead({ telefon: '123' }), 'telefon')
  await reject('Falsche E-Mail abgewiesen', lead({ email: 'kein-at' }), 'email')
  await reject('Ohne Einwilligung abgewiesen', lead({ einwilligung: false }), 'einwilligung')
  await reject('Fremde Herkunft abgewiesen', lead(), null, 403, { ...H, Origin: 'https://fremd.example' })
  const hp = await post(lead({ vorname: 'Bot', website: 'http://spam.example' }))
  check('Honeypot: Antwort ok, aber nichts gespeichert (wird unten geprüft)', hp.status === 200)
  r = await post(lead({ vorname: '<b>Xss</b>', telefon: '170 1112223' }))
  check('Name mit HTML wird angenommen (und im CRM escaped)', r.status === 200)

  console.log('\nCRM: Anmeldung')
  let html = ''
  r = await admin('/admin')
  check('/admin ohne Sitzung leitet zum Login', r.status === 302 && r.headers.get('location').endsWith('/admin/login'))
  html = await (await admin('/admin/login')).text()
  check('Login-Seite fragt E-Mail und Passwort ab', html.includes('name="email"') && html.includes('name="password"'))
  r = await admin('/admin/login', form({ email: EMAIL, password: 'falsch' }))
  check('Richtige E-Mail, falsches Passwort: 401', r.status === 401, String(r.status))
  r = await admin('/admin/login', form({ email: 'fremd@example.com', password: PW }))
  check('Falsche E-Mail, richtiges Passwort: 401', r.status === 401, String(r.status))
  r = await admin('/admin/login', form({ email: '  ' + EMAIL.toUpperCase() + ' ', password: PW }))
  const set = r.headers.get('set-cookie') || ''
  cookie = set.split(';')[0]
  check('E-Mail (Groß/klein egal) und Passwort: Weiterleitung und HttpOnly-Cookie', r.status === 303 && /mb_crm=/.test(set) && /HttpOnly/i.test(set), `${r.status} ${set}`)
  check('Login-Seite zeigt lokal den Hinweis auf „CRM direkt“', html.includes('login__hint') && html.includes('demo-lokal.sh --passwort'))

  console.log('\nLokale Demo: Einmal-Link ins Dashboard')
  r = await fetch(BASE + '/admin/demo/falscher-wert-1234567890', { redirect: 'manual' })
  check('Falscher Demo-Link: 404', r.status === 404, String(r.status))
  r = await fetch(BASE + '/admin/demo/' + DEMO_TOKEN, { redirect: 'manual' })
  const demoCookie = (r.headers.get('set-cookie') || '').split(';')[0]
  check('Richtiger Demo-Link: Weiterleitung ins Dashboard mit Sitzung', r.status === 302 && r.headers.get('location').endsWith('/admin') && /mb_crm=/.test(demoCookie), String(r.status))
  r = await fetch(BASE + '/admin', { redirect: 'manual', headers: { Cookie: demoCookie } })
  check('Mit dem Demo-Link ist das Dashboard offen', r.status === 200)

  console.log('\nCRM: Leads')
  r = await admin('/admin')
  html = await r.text()
  check('Übersicht zeigt die Anfrage', r.status === 200 && html.includes('Stefan'))
  check('Übersicht ohne Honeypot-Eintrag', !html.includes('>Bot<'))
  check('HTML im Namen ist escaped', html.includes('&lt;b&gt;Xss&lt;/b&gt;') && !html.includes('<b>Xss</b>'))
  r = await admin(`/admin/leads/${nr}`)
  html = await r.text()
  check('Detailseite mit Antworten und WhatsApp-Link', r.status === 200 && html.includes('Getrennt, kommt nicht los') && html.includes('https://wa.me/4915123456789'))
  check('E-Mail klein geschrieben gespeichert', html.includes('stefan@example.de'))
  check('Video-Kennung gespeichert', html.includes('gaslighting'))
  r = await admin(`/admin/leads/${nr}/status`, form({ status: 'termin' }))
  check('Status ändern', r.status === 303)
  r = await admin(`/admin/leads/${nr}/notiz`, form({ text: 'Termin am Donnerstag 18 Uhr' }))
  check('Notiz speichern', r.status === 303)
  html = await (await admin(`/admin/leads/${nr}`)).text()
  check('Verlauf zeigt Status und Notiz', html.includes('Neu → Termin vereinbart') && html.includes('Termin am Donnerstag 18 Uhr'))
  html = await (await admin('/admin/leads?status=termin')).text()
  check('Filter nach Status', html.includes('Stefan') && !html.includes('Xss'))
  r = await admin('/admin/leads?q=0151%20234')
  html = await r.text()
  check('Suche nach Telefonnummer mit führender 0', html.includes('Stefan'))
  r = await admin(`/admin/leads?q=${nr}`)
  check('Suche nach Anfrage-Nr. öffnet den Lead', r.status === 302 && r.headers.get('location').endsWith(`/admin/leads/${nr}`))
  r = await admin('/admin/export.csv')
  const csv = await r.text()
  check('CSV-Export', r.status === 200 && /text\/csv/.test(r.headers.get('content-type')) && csv.includes(nr) && csv.includes('"+49 151 23456789"'))
  r = await admin(`/admin/leads/${nr}/status`, { ...form({ status: 'klient' }), headers: { ...form({}).headers, Origin: 'https://fremd.example' } })
  check('CRM-Formular von fremder Seite abgewiesen', r.status === 403, String(r.status))

  console.log('\nCRM: Löschen und Abmelden')
  const xss = (await (await admin('/admin/leads?q=Xss')).text()).match(/\/admin\/leads\/(\d{6})/)
  r = await admin(`/admin/leads/${xss?.[1]}/loeschen`, form({}))
  html = await (await admin('/admin/leads')).text()
  check('Lead endgültig löschen', r.status === 303 && !html.includes('Xss'))
  r = await admin('/admin/logout', form({}))
  check('Abmelden', r.status === 303)
  r = await admin('/admin/leads')
  check('Nach dem Abmelden gilt die Sitzung nicht mehr', r.status === 302)

  console.log('\nDrosselung')
  let last = 0
  for (let i = 0; i < 8; i++) last = (await post(lead({ telefon: `160 55500${i}${i}` }))).status
  check('Zu viele Anfragen je Verbindung und Stunde: 429', last === 429, String(last))
  for (let i = 0; i < 5; i++) last = (await admin('/admin/login', form({ email: EMAIL, password: 'falsch' + i }))).status
  r = await admin('/admin/login', form({ email: EMAIL, password: PW }))
  check('Nach 5 Fehlversuchen ist der Login gesperrt, auch mit richtigem Passwort', r.status === 429, String(r.status))
  r = await fetch(BASE + '/admin/demo/' + DEMO_TOKEN, { redirect: 'manual' })
  check('Lokale Demo: Der Einmal-Link öffnet das Dashboard auch während der Sperre', r.status === 302 && r.headers.get('location').endsWith('/admin'), String(r.status))
} catch (err) {
  failed++
  console.error('\nAbbruch:', err.message)
} finally {
  stop()
}

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`)
process.exit(failed ? 1 : 0)
