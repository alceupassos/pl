import { NextRequest, NextResponse } from "next/server";

import { gerarResposta } from "@/lib/cobranca";
import { historicoDoMembro, logConversa } from "@/lib/conversas";
import { gerarRespostaEleitor } from "@/lib/eleitor-ia";
import { findEleitorByPhone, patchEleitor } from "@/lib/eleitores";
import { findMembroByPhone, patchMembro } from "@/lib/organizadores";
import { sendWhatsappText } from "@/lib/whatsapp-push";

const noStore = { "Cache-Control": "no-store" };
const OPTOUT = new Set(["PARAR", "SAIR", "STOP", "CANCELAR", "DESCADASTRAR"]);

// Webhook de ENTRADA do whatsgate: recebe mensagens dos membros e a IA responde
// (conversa 2 vias), cobrando a meta. Registrar a URL no whatsgate apontando aqui.
export async function POST(request: NextRequest) {
  // Webhook protegido pela WHATSGATE_API_KEY (alias WHATSGATE_TOKEN/WEBHOOK_TOKEN).
  // Aceita o token via ?token=, header X-API-Key ou Authorization: Bearer.
  const expected = (
    process.env.WHATSGATE_WEBHOOK_TOKEN ||
    process.env.WHATSGATE_API_KEY ||
    process.env.WHATSGATE_TOKEN
  )?.trim();
  if (expected) {
    const provided =
      request.nextUrl.searchParams.get("token") ||
      request.headers.get("x-api-key") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";
    if (provided !== expected) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
    }
  }

  const body = await request.json().catch(() => ({}));
  // Payload do whatsgate (OpenWA/WAHA): pode vir aninhado em .payload/.data/.message.
  const p =
    (body?.payload as Record<string, unknown>) ??
    (body?.data as Record<string, unknown>) ??
    (body?.message as Record<string, unknown>) ??
    body ??
    {};

  const event = String(body?.event ?? body?.type ?? "").toLowerCase();
  if (event && !event.includes("message")) {
    return NextResponse.json({ ok: true, skip: "evento" }, { headers: noStore });
  }

  const fromMe = p?.fromMe === true || body?.fromMe === true;
  const fromRaw = String(p?.from ?? p?.chatId ?? p?.sender ?? p?.author ?? body?.from ?? "");
  const texto = String(
    p?.body ?? p?.text ?? p?.message ?? p?.caption ?? body?.body ?? body?.text ?? "",
  ).trim();

  if (fromMe || !fromRaw || !texto) {
    return NextResponse.json({ ok: true, skip: "vazio" }, { headers: noStore });
  }
  // Ignora grupos (@g.us) — só atende contatos individuais.
  if (fromRaw.includes("@g.us")) {
    return NextResponse.json({ ok: true, skip: "grupo" }, { headers: noStore });
  }

  const telefone = fromRaw.replace(/@.*$/, "");
  // Casa com um membro da REDE (cobrança) ou um ELEITOR (pesquisa/preparação).
  const membro = await findMembroByPhone(telefone);
  const eleitor = membro ? null : await findEleitorByPhone(telefone);
  if (!membro && !eleitor) {
    return NextResponse.json({ ok: true, skip: "desconhecido" }, { headers: noStore });
  }
  const id = membro ? membro.id : eleitor!.id;

  await logConversa(id, telefone, "in", texto, "inbound");

  // Opt-out por palavra-chave.
  if (OPTOUT.has(texto.toUpperCase())) {
    if (membro) await patchMembro(membro.id, { optout: true });
    else await patchEleitor(id, { optout: true });
    const msg = "Ok! Não enviaremos mais mensagens automáticas. Quando quiser voltar, é só avisar. Obrigado!";
    const ok = await sendWhatsappText(telefone, msg);
    if (ok) await logConversa(id, telefone, "out", msg, "optout");
    return NextResponse.json({ ok: true, optout: true }, { headers: noStore });
  }

  const historico = await historicoDoMembro(id, 16);
  const resposta = membro
    ? await gerarResposta(membro, historico, texto)
    : await gerarRespostaEleitor(eleitor!, historico, texto);
  const ok = await sendWhatsappText(telefone, resposta);
  if (ok) await logConversa(id, telefone, "out", resposta, "ia");

  return NextResponse.json({ ok: true, respondido: ok }, { headers: noStore });
}

// Alguns gateways validam o webhook com um GET.
export async function GET() {
  return NextResponse.json({ ok: true }, { headers: noStore });
}
