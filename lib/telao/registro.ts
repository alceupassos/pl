// Registro simples do telão (/telao/pleitos e /c): nome + WhatsApp, sem senha.
// Gera um cookie próprio (telao_reg) que libera SÓ o telão — não dá acesso ao
// cockpit, que continua exigindo o login principal (lib/auth.ts).

import { signJwt, verifyJwt } from "@/lib/auth";

export const TELAO_REG_COOKIE = "telao_reg";
export const TELAO_REG_TTL = 60 * 60 * 24 * 30; // 30 dias

export type TelaoRegistro = { kind: "telao_reg"; nome: string; phone: string; exp: number };

export function assinarRegistro(nome: string, phone: string): string {
  return signJwt({ kind: "telao_reg", nome, phone, exp: Math.floor(Date.now() / 1000) + TELAO_REG_TTL });
}

export function lerRegistro(token: string | undefined): TelaoRegistro | null {
  if (!token) return null;
  const p = verifyJwt(token) as (Partial<TelaoRegistro> & { exp: number }) | null;
  if (!p || p.kind !== "telao_reg" || typeof p.nome !== "string" || typeof p.phone !== "string") return null;
  return p as TelaoRegistro;
}
