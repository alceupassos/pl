import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { gerarCobranca } from "@/lib/cobranca";
import { getMembro } from "@/lib/organizadores";

const noStore = { "Cache-Control": "no-store" };

// Gera (preview) a mensagem de cobrança da meta de um membro — NÃO envia.
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
  const mensagem = await gerarCobranca(membro);
  return NextResponse.json({ mensagem }, { headers: noStore });
}
