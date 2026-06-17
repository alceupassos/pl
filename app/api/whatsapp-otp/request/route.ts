import { NextRequest, NextResponse } from "next/server";

import { createOtp } from "@/lib/otp-store";
import { normalizePhone } from "@/lib/phone";
import { sendWhatsappText } from "@/lib/whatsapp-push";

const noStore = { "Cache-Control": "no-store" } as const;

// Envia um código de 4 dígitos para o WhatsApp informado.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const norm = normalizePhone(typeof body?.whatsapp === "string" ? body.whatsapp : "");

  if (!norm.ok) {
    return NextResponse.json(
      { sent: false, error: "invalid_phone" },
      { status: 400, headers: noStore },
    );
  }

  const result = createOtp(norm.phone);
  if (!result.ok) {
    return NextResponse.json(
      { sent: false, error: result.error, retryAfterMs: result.retryAfterMs },
      { status: 429, headers: noStore },
    );
  }

  const message =
    `Seu codigo de acesso ao cockpit: ${result.code}\n` +
    `Valido por 10 minutos. Nao compartilhe este codigo.`;

  // Em dev sem Whatsgate configurado, loga o código para permitir testar localmente.
  const delivered = await sendWhatsappText(norm.phone, message);
  if (!delivered && process.env.NODE_ENV !== "production") {
    console.warn(`[otp] (dev) codigo para ${norm.phone}: ${result.code}`);
  }

  return NextResponse.json({ sent: true }, { headers: noStore });
}
