import { NextResponse } from "next/server";

import { getNoticias } from "@/lib/telao/noticias";

export const dynamic = "force-dynamic";

// Manchetes de eleição dos principais veículos (cache 5 min).
export async function GET() {
  return NextResponse.json(await getNoticias());
}
