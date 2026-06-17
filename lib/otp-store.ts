// Store de códigos de verificação (OTP) de WhatsApp — em memória, com TTL.
// PM2 roda instância única; código curto e efêmero. Restart só obriga a pedir
// um novo código. O código em texto NUNCA é persistido — guardamos só o HMAC.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const SECRET = process.env.AUTH_JWT_SECRET || "dev-jwt-secret-change-me";

const TTL_MS = 10 * 60 * 1000; // validade do código
const RESEND_COOLDOWN_MS = 30 * 1000; // intervalo mínimo entre reenvios
const MAX_ATTEMPTS = 5; // tentativas de verificação por código

type OtpRecord = {
  hash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

const store = new Map<string, OtpRecord>();

function hashCode(phone: string, code: string): string {
  return createHmac("sha256", SECRET).update(`${phone}:${code}`).digest("hex");
}

function purgeExpired(now: number): void {
  for (const [phone, rec] of store) {
    if (rec.expiresAt < now) store.delete(phone);
  }
}

export type CreateOtpResult =
  | { ok: true; code: string }
  | { ok: false; error: "rate_limited"; retryAfterMs: number };

/** Gera um código de 4 dígitos para `phone` (só dígitos). Retorna o código em
 * texto APENAS para envio — nunca exponha via API. */
export function createOtp(phone: string): CreateOtpResult {
  const now = Date.now();
  purgeExpired(now);

  const existing = store.get(phone);
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return {
      ok: false,
      error: "rate_limited",
      retryAfterMs: RESEND_COOLDOWN_MS - (now - existing.lastSentAt),
    };
  }

  const code = String(randomInt(0, 10000)).padStart(4, "0");
  store.set(phone, {
    hash: hashCode(phone, code),
    expiresAt: now + TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });

  return { ok: true, code };
}

export type VerifyOtpResult = "ok" | "invalid" | "expired" | "too_many" | "not_found";

/** Confere o código de `phone`. Consome o registro no sucesso. */
export function verifyOtp(phone: string, code: string): VerifyOtpResult {
  const now = Date.now();
  const rec = store.get(phone);
  if (!rec) return "not_found";

  if (rec.expiresAt < now) {
    store.delete(phone);
    return "expired";
  }

  if (rec.attempts >= MAX_ATTEMPTS) {
    store.delete(phone);
    return "too_many";
  }

  rec.attempts += 1;

  const expected = Buffer.from(rec.hash, "hex");
  const received = Buffer.from(hashCode(phone, code), "hex");
  const match =
    expected.length === received.length && timingSafeEqual(expected, received);

  if (!match) return "invalid";

  store.delete(phone);
  return "ok";
}
