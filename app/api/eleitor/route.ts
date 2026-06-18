import { NextRequest, NextResponse } from "next/server";

import { logConversa } from "@/lib/conversas";
import { gerarBoasVindas } from "@/lib/eleitor-ia";
import { addEleitor, type Eleitor } from "@/lib/eleitores";
import { getMembro } from "@/lib/organizadores";
import { normalizePhone } from "@/lib/phone";
import { sendWhatsappText } from "@/lib/whatsapp-push";

const noStore = { "Cache-Control": "no-store" };

// Cadastro PÚBLICO de Eleitor Ativo (via QR do cabo). Sem OTP. Dispara a
// mensagem de boas-vindas por IA no WhatsApp (fire-and-forget).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const cidade = typeof body?.cidade === "string" ? body.cidade.trim() : "";
  const caboId = typeof body?.caboId === "string" ? body.caboId.trim() : "";
  const tel = normalizePhone(typeof body?.whatsapp === "string" ? body.whatsapp : "");

  if (!nome || !tel.ok) {
    return NextResponse.json(
      { saved: false, error: "dados_invalidos" },
      { status: 400, headers: noStore },
    );
  }

  const eleitor = await addEleitor({ nome, whatsapp: tel.phone, cidade, caboId });

  // Boas-vindas por IA — não bloqueia a resposta.
  void enviarBoasVindas(eleitor, caboId);

  return NextResponse.json({ saved: true }, { headers: noStore });
}

async function enviarBoasVindas(eleitor: Eleitor, caboId: string): Promise<void> {
  try {
    const cabo = caboId ? await getMembro(caboId) : null;
    const msg = await gerarBoasVindas(eleitor, cabo?.nome);
    const ok = await sendWhatsappText(eleitor.whatsapp, msg);
    if (ok) await logConversa(eleitor.id, eleitor.whatsapp, "out", msg, "boasvindas");
  } catch {
    /* falha de IA/whatsgate não derruba o cadastro */
  }
}
