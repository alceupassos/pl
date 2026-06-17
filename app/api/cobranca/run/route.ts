import { NextRequest, NextResponse } from "next/server";

import { gerarCobranca } from "@/lib/cobranca";
import { logConversa, ultimaCobranca } from "@/lib/conversas";
import { listMembros, pctCadastro } from "@/lib/organizadores";
import { normalizePhone } from "@/lib/phone";
import { sendWhatsappText } from "@/lib/whatsapp-push";

const noStore = { "Cache-Control": "no-store" };
const ANTISPAM_MS = 6 * 24 * 60 * 60 * 1000; // 1 cobrança por membro a cada ~6 dias

// Cobrança AGENDADA: protegida por token (COBRANCA_CRON_TOKEN). Acionar por cron.
// Cobra quem está ABAIXO da meta, ativo, sem opt-out e fora da janela anti-spam.
async function run(token: string) {
  const expected = process.env.COBRANCA_CRON_TOKEN?.trim();
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const membros = await listMembros();
  const agora = Date.now();
  const resultado: { id: string; nome: string; enviado: boolean; motivo?: string }[] = [];

  for (const m of membros) {
    if (m.status === "inativo" || m.optout) {
      resultado.push({ id: m.id, nome: m.nome, enviado: false, motivo: "inativo/optout" });
      continue;
    }
    if (pctCadastro(m) >= 100) {
      resultado.push({ id: m.id, nome: m.nome, enviado: false, motivo: "meta_atingida" });
      continue;
    }
    const tel = normalizePhone(m.whatsapp);
    if (!tel.ok) {
      resultado.push({ id: m.id, nome: m.nome, enviado: false, motivo: "whatsapp_invalido" });
      continue;
    }
    const ultima = await ultimaCobranca(m.id);
    if (ultima && agora - new Date(ultima.at).getTime() < ANTISPAM_MS) {
      resultado.push({ id: m.id, nome: m.nome, enviado: false, motivo: "antispam" });
      continue;
    }
    const msg = await gerarCobranca(m);
    const enviado = await sendWhatsappText(tel.phone, msg);
    if (enviado) await logConversa(m.id, tel.phone, "out", msg, "agendado");
    resultado.push({ id: m.id, nome: m.nome, enviado });
  }

  const enviados = resultado.filter((r) => r.enviado).length;
  return NextResponse.json({ ok: true, enviados, total: membros.length, resultado }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token =
    request.nextUrl.searchParams.get("token") ??
    (typeof body?.token === "string" ? body.token : "") ??
    "";
  return run(token);
}

export async function GET(request: NextRequest) {
  return run(request.nextUrl.searchParams.get("token") ?? "");
}
