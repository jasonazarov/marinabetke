#!/usr/bin/env node
/**
 * Passwort für das CRM als Hash (PBKDF2-SHA256, 100.000 Runden, zufälliges Salz).
 * Das Passwort selbst wird nirgends gespeichert.
 *
 *   node scripts/admin-passwort.mjs              fragt das Passwort ab, gibt den Hash aus
 *   node scripts/admin-passwort.mjs --dev-vars   schreibt ADMIN_PASSWORD_HASH in .dev.vars
 *                                                (lokale Demo, Datei ist nicht im Repo)
 *
 * Ohne Rückfrage: Passwort in der Umgebungsvariable ADMIN_PASSWORT übergeben.
 * Live braucht es diesen Hash nicht: dort genügt `npx wrangler secret put ADMIN_PASSWORD`.
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ITERATIONS = 100000 // Höchstwert für PBKDF2 in Cloudflare Workers

export function hashPassword(password, iterations = ITERATIONS) {
  const salt = randomBytes(16)
  const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
  return `pbkdf2-sha256.${iterations}.${salt.toString('base64')}.${hash.toString('base64')}`
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s) }
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer) })
  })
}

async function main() {
  let pw = process.env.ADMIN_PASSWORT
  if (!pw) {
    if (!process.stdin.isTTY) {
      console.error('Bitte in einem Terminal ausführen oder ADMIN_PASSWORT setzen.')
      process.exit(1)
    }
    pw = await askHidden('Passwort: ')
    const again = await askHidden('Noch einmal: ')
    if (pw !== again) {
      console.error('Die beiden Eingaben sind verschieden.')
      process.exit(1)
    }
  }
  if (!pw) {
    console.error('Kein Passwort eingegeben.')
    process.exit(1)
  }
  const line = `ADMIN_PASSWORD_HASH="${hashPassword(pw)}"`

  if (process.argv.includes('--dev-vars')) {
    const file = join(ROOT, '.dev.vars')
    const old = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l && !l.startsWith('ADMIN_PASSWORD_HASH=')) : []
    writeFileSync(file, [...old, line].join('\n') + '\n', { mode: 0o600 })
    console.log('Passwort-Hash in .dev.vars gespeichert (nur auf diesem Rechner).')
  } else {
    console.log(line)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
