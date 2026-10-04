import { NextResponse } from "next/server";

import { getMunicipiosSP } from "@/lib/telao/tse-apuracao";

export const dynamic = "force-dynamic";

// Municípios de SP com suas zonas eleitorais (config oficial TSE 2026).
export async function GET() {
  return NextResponse.json(await getMunicipiosSP(), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
