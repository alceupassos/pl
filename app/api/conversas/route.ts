import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { historicoDoMembro } from "@/lib/conversas";

const noStore = { "Cache-Control": "no-store" };

// Histórico de conversa de um membro (para exibir no painel da rede).
export async function GET(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const membroId = request.nextUrl.searchParams.get("membroId") ?? "";
  if (!membroId) {
    return NextResponse.json({ conversas: [] }, { headers: noStore });
  }
  const conversas = await historicoDoMembro(membroId, 40);
  return NextResponse.json({ conversas }, { headers: noStore });
}
