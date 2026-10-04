import { NextResponse } from "next/server";

import { NOTICIAS_TODAS, getNoticias } from "@/lib/telao/noticias";

export const dynamic = "force-dynamic";

// Manchetes de eleição dos principais veículos (cache 5 min).
// Padrão: recorte curto do letreiro do telão. ?todas=1: lista completa (página de notícias).
export async function GET(req: Request) {
  const todas = new URL(req.url).searchParams.get("todas") === "1";
  return NextResponse.json(await getNoticias(todas ? NOTICIAS_TODAS : undefined));
}
