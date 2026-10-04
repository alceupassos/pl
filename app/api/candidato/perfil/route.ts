import { NextResponse } from "next/server";

import {
  checarPushResultado,
  foiAtivadoHoje,
  getPerfilCandidato,
  savePerfilCandidato,
} from "@/lib/telao/candidato-push";

export const dynamic = "force-dynamic";

// GET /api/candidato/perfil → retorna perfil + status se foi ativado hoje
export async function GET() {
  const p = await getPerfilCandidato();
  return NextResponse.json({
    perfil: p,
    ativadoHoje: foiAtivadoHoje(p),
  });
}

// POST /api/candidato/perfil → salva/ativa o perfil do candidato no dia (disponível para múltiplos PCs)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const salvo = await savePerfilCandidato(body);

    // Dispara checagem imediata de push de resultado se a apuração estiver em andamento
    checarPushResultado().catch(() => {});

    return NextResponse.json({
      ok: true,
      perfil: salvo,
      ativadoHoje: true,
      mensagem: "Perfil do candidato ativado com sucesso para o dia de hoje!",
    });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar perfil" }, { status: 400 });
  }
}
