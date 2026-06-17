import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { gerarCobranca } from "@/lib/cobranca";
import { logConversa } from "@/lib/conversas";
import { getMembro } from "@/lib/organizadores";
import { normalizePhone } from "@/lib/phone";
import { sendWhatsappText } from "@/lib/whatsapp-push";

const noStore = { "Cache-Control": "no-store" };

// Cobrança MANUAL: gera a mensagem por IA e ENVIA via whatsgate ao membro.
export async function POST(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  const membro = id ? await getMembro(id) : null;
  if (!membro) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  const tel = normalizePhone(membro.whatsapp);
  if (!tel.ok) {
    return NextResponse.json({ error: "whatsapp_invalido" }, { status: 400, headers: noStore });
  }
  if (membro.optout) {
    return NextResponse.json({ error: "optout" }, { status: 409, headers: noStore });
  }

  const mensagem = await gerarCobranca(membro);
  const enviado = await sendWhatsappText(tel.phone, mensagem);
  if (enviado) {
    await logConversa(membro.id, tel.phone, "out", mensagem, "manual");
  }
  return NextResponse.json(
    { sent: enviado, mensagem },
    { status: enviado ? 200 : 502, headers: noStore },
  );
}
