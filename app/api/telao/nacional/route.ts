import { NextResponse } from "next/server";

import { getPanorama } from "@/lib/telao/tse-nacional";

export const dynamic = "force-dynamic";

// GET /api/telao/nacional → governadores, Senado, Câmara e Assembleias das 27 UFs
export async function GET() {
  try {
    return NextResponse.json(await getPanorama());
  } catch {
    return NextResponse.json({ error: "indisponível" }, { status: 503 });
  }
}
