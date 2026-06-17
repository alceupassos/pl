import { NextRequest, NextResponse } from "next/server";

import { signJwt } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp-store";
import { normalizePhone } from "@/lib/phone";

const noStore = { "Cache-Control": "no-store" } as const;

const VERIFY_TOKEN_TTL_SECONDS = 10 * 60;

// Confere o código e devolve um comprovante (JWT curto) de número verificado.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const norm = normalizePhone(typeof body?.whatsapp === "string" ? body.whatsapp : "");
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";

  if (!norm.ok || code.length !== 4) {
    return NextResponse.json(
      { verified: false, error: "invalid_code" },
      { status: 400, headers: noStore },
    );
  }

  const result = verifyOtp(norm.phone, code);
  if (result !== "ok") {
    const status = result === "too_many" ? 429 : 400;
    return NextResponse.json(
      { verified: false, error: result },
      { status, headers: noStore },
    );
  }

  const token = signJwt({
    kind: "wpp_verify",
    phone: norm.phone,
    exp: Math.floor(Date.now() / 1000) + VERIFY_TOKEN_TTL_SECONDS,
  });

  return NextResponse.json({ verified: true, token }, { headers: noStore });
}
