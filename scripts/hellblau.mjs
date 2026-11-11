#!/usr/bin/env node
/**
 * Erzeugt die hellblaue Gestaltung aus Marinas Original-Stylesheet.
 *
 *   node scripts/hellblau.mjs           schreibt public/assets/css/hellblau.css
 *   node scripts/hellblau.mjs --check   prüft nur, ob die Datei aktuell ist
 *
 * Quelle bleibt unverändert: public/assets/css/style.css (Original von
 * marinabetke.de). Wer zurück zum Original will, verlinkt in den Seiten
 * wieder style.css statt hellblau.css.
 *
 * Jede Farbe wird nach ihrer Rolle umgefärbt, nicht stumpf ersetzt:
 *   Hintergrund   Nachtblau → Hellblau, Creme → kühles Weißblau, Kupfer → Blau
 *   Text          Nachtblau → Tiefblau, Weiß/Creme (stand auf Dunkel) → dunkler Text,
 *                 Kupfer → Akzentblau
 *   Rahmen        Weiß-Transparent (auf Dunkel) → zartes Blau
 *   Schatten      Nachtblau → weicher Blauschatten
 * Danach kommen die Feinheiten von Hand: styles/hellblau-extra.css.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public/assets/css/style.css')
const EXTRA = join(ROOT, 'styles/hellblau-extra.css')
const OUT = join(ROOT, 'public/assets/css/hellblau.css')

/* ------------------------------------------------------------ Farben */

const hex2 = (n) => Math.round(n).toString(16).padStart(2, '0')
const fmt = ([r, g, b, a]) => (a >= 1 ? `#${hex2(r)}${hex2(g)}${hex2(b)}` : `rgba(${r},${g},${b},${+a.toFixed(3)})`)

function parseColor(tok) {
  const t = tok.toLowerCase()
  if (t === 'white') return [255, 255, 255, 1]
  let m = /^#([0-9a-f]{3})$/.exec(t)
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16)).concat(1)
  m = /^#([0-9a-f]{6})$/.exec(t)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1)
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(t)
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]]
  return null
}

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

/** Familie einer Farbe: dunkel (Nachtblau), hell (Weiß/Creme), warm (Kupfer/Gold), schwarz, sonst. */
function family([r, g, b]) {
  if (r === 0 && g === 0 && b === 0) return 'black'
  const L = lum(r, g, b)
  if (L < 0.12) return 'dark'
  if (L > 0.72 && r - b < 40) return 'light'
  if (r > b + 25 && r >= g) return 'warm'
  if (L > 0.55) return 'light'
  return 'other'
}

/* Feste Ziele je Familie und Rolle. */
const DEEP_TEXT = [15, 49, 80]        // #0f3150
const BODY_TEXT = [18, 50, 76]        // #12324c
const ACCENT_TEXT = [26, 104, 168]    // #1a68a8
const ACCENT = [31, 124, 196]         // #1f7cc4  Knöpfe, Punkte, Linien
const ACCENT_DARK = [24, 104, 166]    // #1868a6  Hover
const ACCENT_LIGHT = [178, 215, 242]  // #b2d7f2
const SHADOW = [22, 70, 112]

/** Dunkle Flächen: je dunkler das Original, desto kräftiger das Hellblau. */
function darkSurface([r, g, b]) {
  const L = lum(r, g, b)
  if (L < 0.012) return [197, 224, 245] // fast schwarz
  if (L < 0.03) return [205, 229, 247]  // Nacht tief
  if (L < 0.06) return [217, 236, 249]  // Nacht
  return [228, 242, 252]                // Nacht hell / Teal
}

/** Creme und Warmweiß werden kühl, Weiß bleibt Weiß. */
function coolLight([r, g, b]) {
  if (r === 255 && g === 255 && b === 255) return [255, 255, 255]
  const L = lum(r, g, b)
  if (L > 0.9) return [246, 250, 254]
  if (L > 0.8) return [234, 244, 251]
  if (L > 0.7) return [222, 237, 248]
  return [205, 226, 243]
}

function mapRgba(c, role) {
  const [r, g, b, a] = c
  const fam = family(c)
  const A = (rgb, alpha = a) => [...rgb, Math.min(1, alpha)]
  switch (role) {
    case 'text':
      if (fam === 'dark') return A(a < 0.6 ? DEEP_TEXT : DEEP_TEXT, Math.max(a, 0.72))
      if (fam === 'light') return a >= 0.82 ? A(BODY_TEXT, 1) : A(BODY_TEXT, Math.max(0.66, a))
      if (fam === 'warm') return A(lum(r, g, b) > 0.5 ? [42, 116, 179] : ACCENT_TEXT, Math.max(a, 0.85))
      if (fam === 'other') return A([44, 69, 88])
      return c
    case 'bg':
      if (fam === 'dark') return a < 0.35 ? A([30, 110, 180], a) : A(darkSurface(c))
      if (fam === 'light') {
        const base = coolLight(c)
        return a < 0.3 ? A(base, Math.min(0.92, 0.35 + a * 3.5)) : A(base)
      }
      if (fam === 'warm') {
        const L = lum(r, g, b)
        if (L > 0.55) return A(ACCENT_LIGHT)
        if (r === 230 && g === 180) return A(ACCENT_DARK)
        return A(r < 200 ? ACCENT_DARK : ACCENT)
      }
      if (fam === 'other') return A([205, 226, 243])
      return c
    case 'border':
      if (fam === 'dark') return a < 0.5 ? A([30, 90, 140], a * 0.8) : A([176, 206, 230])
      if (fam === 'light') return a >= 0.9 ? c : A([40, 110, 170], 0.12 + a * 0.5)
      if (fam === 'warm') return A(lum(r, g, b) > 0.5 ? ACCENT_LIGHT : ACCENT)
      if (fam === 'other') return A([176, 206, 230])
      return c
    case 'shadow':
      if (fam === 'dark') return A(SHADOW, a * 0.7)
      if (fam === 'warm') return A(ACCENT)
      return c
    default: // eigene Variablen, deren Rolle offen ist
      if (fam === 'dark') return A(DEEP_TEXT)
      if (fam === 'light') return A(coolLight(c))
      if (fam === 'warm') return A(ACCENT_TEXT)
      return c
  }
}

/* Variablen nach Rolle: im Text heißt Nachtblau „Tiefblau“, im Hintergrund „Hellblau“. */
const VAR_MAP = {
  text: {
    flaeche: 'hb-text', papier: 'hb-text', 'papier-2': 'hb-text', 'leise-hell': 'hb-muted',
    kupfer: 'hb-accent-text', 'kupfer-hell': 'hb-accent-text', 'sl-sand': 'hb-accent-text',
    'sl-sand2': 'hb-accent-text', 'sl-green': 'hb-accent-text', 'marina-gold': 'hb-accent-text',
    'marina-cream': 'hb-text', 'marina-gold-light': 'hb-accent-text',
  },
  bg: { nacht: 'hb-surface', 'nacht-tief': 'hb-surface-2', 'nacht-2': 'hb-card', 'sl-dark': 'hb-surface', 'sl-dark2': 'hb-surface-2', tinte: 'hb-surface' },
  border: { nacht: 'hb-border', 'nacht-tief': 'hb-border', 'sl-dark': 'hb-border' },
}

const COLOR_RE = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|\bwhite\b/g

function roleOf(prop) {
  if (/^(color|-webkit-text-fill-color|caret-color|text-decoration-color|fill|stroke|accent-color)$/.test(prop)) return 'text'
  if (/^background/.test(prop)) return 'bg'
  if (/^(border|outline|column-rule)/.test(prop)) return 'border'
  if (/shadow$/.test(prop) || prop === 'filter') return 'shadow'
  if (prop.startsWith('--')) return 'var'
  return 'other'
}

function mapValue(prop, value) {
  let role = roleOf(prop)
  if (role === 'other') return value
  // Eigene Variablen mit Bild oder Verlauf sind Hintergründe.
  if (role === 'var' && /url\(|gradient/.test(value)) role = 'bg'
  let out = value.replace(COLOR_RE, (tok) => {
    const c = parseColor(tok)
    return c ? fmt(mapRgba(c, role)) : tok
  })
  const vm = VAR_MAP[role]
  if (vm) out = out.replace(/var\(--([a-z0-9-]+)\)/g, (all, name) => (vm[name] ? `var(--${vm[name]})` : all))
  return out
}

/* --------------------------------------------- CSS durchgehen

   Jede Deklaration „prop: wert“ in einem Block ohne weitere Klammern wird
   umgefärbt. @font-face und Kommentare bleiben, wie sie sind. */
function transform(css) {
  return css.replace(/([^{}]*)\{([^{}]*)\}/g, (all, selector, body) => {
    if (/@font-face/.test(selector)) return all
    const decls = body.replace(/(^|;)(\s*)([-a-zA-Z0-9]+)(\s*:\s*)([^;]*)/g, (m, sep, ws, prop, colon, val) => {
      return sep + ws + prop + colon + mapValue(prop.toLowerCase(), val)
    })
    return selector + '{' + decls + '}'
  })
}

const TOKENS = `
/* ===== Hellblau: Farbwerte (überschreiben die Tokens des Originals) ===== */
:root {
  --nacht: #0f3150; --nacht-tief: #0b2840; --nacht-2: #24435c;
  --papier: #eef6fc; --papier-2: #e1eef8; --flaeche: #f8fbfe;
  --linie: #d2e3ef; --linie-stark: #8aa3b5;
  --tinte: #12324c; --leise: #4c6275; --leise-hell: #5b7385;
  --kupfer: #1f7cc4; --kupfer-hell: #5aa7e3; --kupfer-tief: #1a64a0;
  --sl-green: #1f7cc4; --sl-dark: #0f3150; --sl-dark2: #0b2840; --sl-sand: #1f7cc4; --sl-sand2: #1868a6;
  --marina-gold: #1a68a8; --marina-gold-light: #b2d7f2; --marina-cream: #f6fafe;
  --hb-text: #12324c; --hb-muted: #4c6275; --hb-accent-text: #1a68a8;
  --hb-surface: #d9ecf9; --hb-surface-2: #cde5f7; --hb-card: #eef6fd; --hb-border: #b0cee6;
}
`

const source = readFileSync(SRC, 'utf8')
const extra = readFileSync(EXTRA, 'utf8')
const result =
  '/* ERZEUGT von scripts/hellblau.mjs aus style.css + styles/hellblau-extra.css. Nicht von Hand ändern. */\n' +
  transform(source) +
  TOKENS +
  '\n/* ===== Feinheiten von Hand (styles/hellblau-extra.css) ===== */\n' +
  extra

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8')
  if (current !== result) {
    console.error('hellblau.css ist nicht aktuell: node scripts/hellblau.mjs ausführen.')
    process.exit(1)
  }
  console.log('hellblau.css ist aktuell.')
} else {
  writeFileSync(OUT, result)
  console.log(`hellblau.css geschrieben (${Math.round(result.length / 1024)} KB).`)
}
