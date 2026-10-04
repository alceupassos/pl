import { NextResponse } from "next/server";

import { getMunicipios, isUF } from "@/lib/telao/tse-apuracao";

export const dynamic = "force-dynamic";

// Municípios da UF (?uf=rj, padrão SP) com suas zonas eleitorais (config oficial TSE 2026).
export async function GET(req: Request) {
  const uf = (new URL(req.url).searchParams.get("uf") ?? "sp").toLowerCase();
  if (!isUF(uf)) return NextResponse.json({ error: "uf inválida" }, { status: 400 });
  return NextResponse.json(await getMunicipios(uf), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
