// Normalização mínima de telefone BR para o fluxo de OTP.
// Confiamos no OTP para provar que o número é real — aqui só checamos formato.

import { verifyJwt } from "@/lib/auth";

export type NormalizedPhone =
  | { ok: true; phone: string } // canônico com DDI: 55 + DDD + número
  | { ok: false; error: "invalid_phone" };

/** Aceita 10–11 dígitos locais (DDD + 8/9), com ou sem DDI 55. */
export function normalizePhone(raw: string): NormalizedPhone {
  let digits = String(raw || "").replace(/\D/g, "");

  // remove DDI 55 se já veio com ele (12 ou 13 dígitos)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return { ok: false, error: "invalid_phone" };
  }

  return { ok: true, phone: `55${digits}` };
}

/** Confere o comprovante de verificação (JWT) emitido por /api/whatsapp-otp/verify
 * e garante que ele pertence ao telefone informado. */
export function verifyPhoneToken(token: unknown, rawPhone: string): boolean {
  if (typeof token !== "string" || !token) return false;
  const norm = normalizePhone(rawPhone);
  if (!norm.ok) return false;

  const payload = verifyJwt(token) as
    | ({ kind?: string; phone?: string } & { exp: number })
    | null;

  return !!payload && payload.kind === "wpp_verify" && payload.phone === norm.phone;
}
