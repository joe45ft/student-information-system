import { nowIso } from "./utils.js";

const enc = new TextEncoder();
// Cloudflare Workers WebCrypto currently rejects PBKDF2 iteration counts above 100,000.
// Keep the production target at the runtime maximum while preserving verification of legacy 10k hashes.
const CLOUDFLARE_PBKDF2_MAX_ITER = 100000;
const CURRENT_ITER = CLOUDFLARE_PBKDF2_MAX_ITER;
const MIN_SUPPORTED_ITER = 10000;
const MAX_SUPPORTED_ITER = CLOUDFLARE_PBKDF2_MAX_ITER;
const SID = "sid";
const CSRF = "csrf";

function b64(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function unb64(value) {
  let normalized = String(value).replaceAll("-", "+").replaceAll("_", "/");
  while (normalized.length % 4) normalized += "=";
  return Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
}

function safeEqualText(a, b) {
  a = String(a ?? "");
  b = String(b ?? "");
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sameOriginRequest(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function randomToken(n = 32) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return b64(bytes);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(String(value)));
  return b64(new Uint8Array(digest));
}

async function derive(password, salt, pepper = "", iterations = CURRENT_ITER) {
  const material = pepper ? `${password}\u0000${pepper}` : password;
  const key = await crypto.subtle.importKey("raw", enc.encode(material), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt,
    iterations,
    hash: "SHA-256"
  }, key, 256));
}

export async function hashPassword(password, pepper = "") {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const out = await derive(password, salt, pepper, CURRENT_ITER);
  return `${pepper ? "pbkdf2p" : "pbkdf2"}$${CURRENT_ITER}$${b64(salt)}$${b64(out)}`;
}

export async function verifyPassword(password, stored, pepper = "") {
  try {
    const [mode, iterationText, saltText, hashText, ...extra] = String(stored).split("$");
    const iterations = Number(iterationText);
    if (extra.length || !["pbkdf2", "pbkdf2p"].includes(mode)) return false;
    if (!Number.isSafeInteger(iterations) || iterations < MIN_SUPPORTED_ITER || iterations > MAX_SUPPORTED_ITER) return false;
    if (mode === "pbkdf2p" && !pepper) return false;

    const expected = unb64(hashText);
    const actual = await derive(password, unb64(saltText), mode === "pbkdf2p" ? pepper : "", iterations);
    if (expected.length !== actual.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
    return diff === 0;
  } catch {
    return false;
  }
}

export function needsPasswordRehash(stored, pepper = "") {
  const [mode, iterationText] = String(stored).split("$");
  const iterations = Number(iterationText);
  if (!Number.isSafeInteger(iterations) || iterations !== CURRENT_ITER) return true;
  if (pepper && mode !== "pbkdf2p") return true;
  return !pepper && mode !== "pbkdf2";
}

export function parseCookies(request) {
  const cookies = {};
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    try {
      cookies[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      cookies[key] = part.slice(i + 1).trim();
    }
  }
  return cookies;
}

export function makeCookie(name, value, { maxAge, httpOnly = true } = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}; Path=/; Secure; SameSite=Lax; Priority=High`;
  if (httpOnly) cookie += "; HttpOnly";
  if (typeof maxAge === "number") cookie += `; Max-Age=${Math.max(0, Math.floor(maxAge))}`;
  return cookie;
}

export const clearSidCookie = () => makeCookie(SID, "", { maxAge: 0 });

export function csrfFor(request) {
  const old = parseCookies(request)[CSRF];
  if (old && old.length >= 20 && old.length <= 128) return { token: old, setCookie: null };
  const token = randomToken(24);
  return { token, setCookie: makeCookie(CSRF, token, { maxAge: 86400, httpOnly: false }) };
}

export function checkCsrf(request, form) {
  if (!sameOriginRequest(request)) return false;
  const cookieToken = parseCookies(request)[CSRF] || "";
  const formToken = String(form._csrf || "");
  return safeEqualText(cookieToken, formToken);
}

export async function createSession(db, userId, request, remember = false) {
  const token = randomToken(32);
  const hash = await sha256(token);
  const start = new Date();
  const end = new Date(start.getTime() + (remember ? 30 : 0.5) * 86400000);
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 300);
  await db.prepare("INSERT INTO sessions(user_id,token_hash,created_at,expires_at,last_seen_at,user_agent) VALUES(?,?,?,?,?,?)")
    .bind(userId, hash, start.toISOString(), end.toISOString(), start.toISOString(), userAgent)
    .run();
  return { token, maxAge: Math.floor((end - start) / 1000) };
}

export async function loadSession(db, request) {
  const token = parseCookies(request)[SID];
  if (!token) return null;
  const hash = await sha256(token);
  const row = await db.prepare(`SELECT s.id session_id,s.expires_at,s.last_seen_at,u.*
    FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND u.status='ACTIVE'`).bind(hash).first();
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  if (Date.now() - Date.parse(row.last_seen_at || 0) > 300000) {
    await db.prepare("UPDATE sessions SET last_seen_at=? WHERE id=?").bind(nowIso(), row.session_id).run();
  }
  return row;
}

export async function revokeCurrentSession(db, request) {
  const token = parseCookies(request)[SID];
  if (!token) return;
  await db.prepare("UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL")
    .bind(nowIso(), await sha256(token)).run();
}

export async function fingerprint(request, pepper = "") {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("cf-connecting-ip") || forwarded || "unknown";
  return sha256(`${ip}\u0000${pepper}`);
}

export const PASSWORD_ITERATIONS = CURRENT_ITER;
