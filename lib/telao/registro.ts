// Registro simples do telão (/telao/pleitos e /c): nome + WhatsApp, sem senha.
// Gera um cookie próprio (telao_reg) que libera SÓ o telão — não dá acesso ao
// cockpit, que continua exigindo o login principal (lib/auth.ts).

import { createHash, randomUUID } from "node:crypto";
import { getSession } from "@/lib/api-auth";
import type { NextRequest } from "next/server";
import { signJwt, verifyJwt } from "@/lib/auth";

export const TELAO_REG_COOKIE = "telao_reg";
export const TELAO_REG_TTL = 60 * 60 * 24 * 30; // 30 dias

export type TelaoRegistro = { kind: "telao_reg"; nome: string; phone: string; id: string; verifiedAt?: string; registeredAt: string; exp: number };

export function assinarRegistro(nome: string, phone: string, verified = false, id: string = randomUUID()): string {
  return signJwt({ kind: "telao_reg", nome, phone, id, registeredAt: new Date().toISOString(), ...(verified ? { verifiedAt: new Date().toISOString() } : {}), exp: Math.floor(Date.now() / 1000) + TELAO_REG_TTL });
}

export function lerRegistro(token: string | undefined): TelaoRegistro | null {
  if (!token) return null;
  const p = verifyJwt(token) as (Partial<TelaoRegistro> & { exp: number }) | null;
  if (!p || p.kind !== "telao_reg" || typeof p.nome !== "string" || typeof p.phone !== "string" || typeof p.registeredAt !== "string" || typeof p.id !== "string") return null;
  return p as TelaoRegistro;
}

export function getTelaoSession(request: NextRequest) {
 const admin = getSession(request); if (admin) return admin;
 const reg = lerRegistro(request.cookies.get(TELAO_REG_COOKIE)?.value);
 if (!reg) return null;
 return { credentialType: "registered" as const, sub: `usage:${createHash("sha256").update(reg.id).digest("hex")}`, exp: reg.exp, nome: reg.nome, phone: reg.phone, verifiedAt: reg.verifiedAt };
}
