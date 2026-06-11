import { createHmac, timingSafeEqual } from "node:crypto";

import { pbkdf2, type Challenge, type Solution, verifySolution } from "altcha/lib";

const AUTH_LOGIN = process.env.AUTH_LOGIN || "guest";
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || "p0l1t1c4@#";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "politica_session";
const ALTCHA_HMAC_SECRET = process.env.ALTCHA_HMAC_SECRET || "dev-altcha-secret-change-me";
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || "dev-jwt-secret-change-me";
// Bypass temporário do ALTCHA para testes (mobile) — controlado por .env.local.
const DISABLE_ALTCHA = process.env.DISABLE_ALTCHA === "true";
const JWT_TTL_SECONDS = 60 * 60 * 24 * 5;

if (DISABLE_ALTCHA) {
  console.warn(
    "⚠️ [AUTH] BYPASS ALTCHA ATIVO (DISABLE_ALTCHA=true) — REMOVER ANTES DE PRODUÇÃO",
  );
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

export function getAuthCredentials() {
  return {
    login: AUTH_LOGIN,
    password: AUTH_PASSWORD,
  };
}

export function getJwtTtlSeconds() {
  return JWT_TTL_SECONDS;
}

export function getAltchaHmacSecret() {
  return ALTCHA_HMAC_SECRET;
}

export function signJwt(payload: Record<string, unknown>) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", AUTH_JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

export function verifyJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = createHmac("sha256", AUTH_JWT_SECRET).update(data).digest("base64url");
  const receivedBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return payload as { credentialType?: "main" | "provisional"; exp: number; ip?: string; sub?: string };
  } catch {
    return null;
  }
}

/**
 * Valida um token de sessão + regra de IP das credenciais provisórias.
 * Único lugar com essa regra — usado por lib/api-auth (rotas API) e pelo
 * gate server-side do /m (app/m/layout.tsx).
 */
export function verifySession(token: string | undefined, requestHeaders: Headers) {
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  const requiresSameIp = payload.credentialType !== "main";
  if (requiresSameIp && payload.ip !== getClientIp(requestHeaders)) {
    return null;
  }
  return payload;
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  return realIp || "unknown";
}

export async function verifyAltchaPayload(payload: string) {
  if (DISABLE_ALTCHA) {
    console.warn("⚠️ [AUTH] verificação ALTCHA pulada por DISABLE_ALTCHA");
    return { verified: true, reason: "bypassed_env_flag" };
  }

  if (!payload) {
    return { verified: false, reason: "missing_payload" };
  }

  let parsed: { challenge?: Challenge; solution?: Solution; test?: boolean } | null = null;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return { verified: false, reason: "invalid_payload" };
  }

  if (parsed?.test) {
    return { verified: false, reason: "test_payload_rejected" };
  }

  if (!parsed?.challenge || !parsed?.solution) {
    return { verified: false, reason: "invalid_shape" };
  }

  const result = await verifySolution({
    challenge: parsed.challenge,
    solution: parsed.solution,
    hmacSignatureSecret: ALTCHA_HMAC_SECRET,
    deriveKey: pbkdf2.deriveKey,
  });

  return {
    verified: result.verified,
    reason: result.verified ? "ok" : "invalid_solution",
    details: result,
  };
}
