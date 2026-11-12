/**
 * Login ins CRM mit E-Mail und Passwort: E-Mail aus ADMIN_LOGIN_EMAIL
 * (wrangler.toml), Passwort als Hash in ADMIN_PASSWORD_HASH (lokal in
 * .dev.vars) oder als Secret ADMIN_PASSWORD (live). Das Passwort steht nie im
 * Repo. Sitzung als Zufallswert im Cookie, in der Datenbank nur sein Hash. Fünf Fehlversuche je Verbindung
 * in 15 Minuten, danach ist bis zum Ablauf der 15 Minuten Ruhe. Für die lokale
 * Demo gibt es zusätzlich einen Einmal-Link (demoLogin), siehe unten.
 */
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { randomToken, sameSecret, sha256, verifyPassword, type Env } from './util'

export const COOKIE = 'mb_crm'
const SESSION_DAYS = 30
export const MAX_FAILS = 5
const FAIL_WINDOW_MS = 15 * 60 * 1000

type C = Context<{ Bindings: Env }>

export async function currentSession(c: C): Promise<boolean> {
  const token = getCookie(c, COOKIE)
  if (!token) return false
  const row = await c.env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash = ?')
    .bind(await sha256('s:' + token))
    .first<{ expires_at: number }>()
  return !!row && row.expires_at > Date.now()
}

export async function recentFails(env: Env, ipHash: string, now = Date.now()): Promise<number> {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash = ? AND at > ?')
    .bind(ipHash, now - FAIL_WINDOW_MS)
    .first<{ n: number }>()
  return r?.n ?? 0
}

export type LoginResult = 'ok' | 'falsch' | 'gesperrt' | 'nicht-eingerichtet'

export const loginReady = (env: Env) => !!env.ADMIN_LOGIN_EMAIL && !!(env.ADMIN_PASSWORD_HASH || env.ADMIN_PASSWORD)

export async function login(c: C, email: string, password: string, ipHash: string): Promise<LoginResult> {
  const env = c.env
  if (!loginReady(env)) return 'nicht-eingerichtet'
  const now = Date.now()
  if ((await recentFails(env, ipHash, now)) >= MAX_FAILS) return 'gesperrt'

  // Beides immer prüfen: Die Antwortzeit verrät nicht, ob nur die E-Mail stimmt.
  const [mailOk, pwOk] = await Promise.all([
    sameSecret(email.trim().toLowerCase(), (env.ADMIN_LOGIN_EMAIL ?? '').trim().toLowerCase()),
    env.ADMIN_PASSWORD_HASH ? verifyPassword(password, env.ADMIN_PASSWORD_HASH) : sameSecret(password, env.ADMIN_PASSWORD ?? ''),
  ])
  if (!(mailOk && pwOk)) {
    await env.DB.prepare('INSERT INTO login_attempts (ip_hash, at) VALUES (?, ?)').bind(ipHash, now).run()
    return (await recentFails(env, ipHash, now)) >= MAX_FAILS ? 'gesperrt' : 'falsch'
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ? OR at < ?').bind(ipHash, now - FAIL_WINDOW_MS).run()
  await startSession(c, now)
  return 'ok'
}

/** Neue Sitzung: Zufallswert ins Cookie, in die Datenbank nur sein Hash. */
async function startSession(c: C, now = Date.now()): Promise<void> {
  const env = c.env
  const token = randomToken()
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256('s:' + token), now, now + SESSION_DAYS * 86400_000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ])
  setCookie(c, COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    maxAge: SESSION_DAYS * 86400,
  })
}

/** Läuft die Seite auf dem eigenen Rechner (lokale Demo)? */
export function isLocal(c: C): boolean {
  const host = new URL(c.req.url).hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
}

/**
 * Lokale Demo: Einmal-Link ins Dashboard, ohne Passwort. Nur wenn
 * DEMO_LOGIN_TOKEN gesetzt ist (setzt allein scripts/demo-lokal.sh, bei jedem
 * Start neu und zufällig) UND die Seite unter localhost läuft. Live ist der
 * Wert nie gesetzt, dort gibt es diesen Zugang nicht.
 */
export async function demoLogin(c: C, token: string): Promise<boolean> {
  const expected = c.env.DEMO_LOGIN_TOKEN
  if (!expected || expected.length < 16 || !isLocal(c)) return false
  if (!(await sameSecret(token, expected))) return false
  await startSession(c)
  return true
}

export async function logout(c: C): Promise<void> {
  const token = getCookie(c, COOKIE)
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256('s:' + token)).run()
  deleteCookie(c, COOKIE, { path: '/' })
}

/**
 * Formulare im CRM ändern Daten. Ein Formular von einer fremden Seite darf das
 * nicht: Kommt eine Herkunft mit, muss sie diese Seite sein.
 */
export function sameOrigin(c: C): boolean {
  const origin = c.req.header('origin')
  if (!origin) return true
  return origin === new URL(c.req.url).origin
}
