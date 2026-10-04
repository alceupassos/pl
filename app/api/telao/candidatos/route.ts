import { NextResponse } from "next/server";

import { getSnapshotUF, isUF } from "@/lib/telao/tse-apuracao";

export const dynamic = "force-dynamic";

// GET /api/telao/candidatos?uf=rj → candidatos (pré-apuração) dos pleitos da UF
export async function GET(req: Request) {
  const uf = (new URL(req.url).searchParams.get("uf") ?? "sp").toLowerCase();
  if (!isUF(uf)) return NextResponse.json({ error: "uf inválida" }, { status: 400 });
  return NextResponse.json(await getSnapshotUF(uf), { headers: { "cache-control": "public, max-age=300" } });
}
