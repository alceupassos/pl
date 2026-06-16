import { NextRequest, NextResponse } from "next/server";

import {
  appendAccessLog,
  appendBriefingLog,
  deleteBriefingById,
  readBriefingLogs,
} from "@/lib/access-log";
import { getSession } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

// Lista os briefings (visíveis para todos na página /basecalculo).
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const briefings = await readBriefingLogs();
  return NextResponse.json({ ok: true, briefings }, { headers: noStore });
}

// Salva um novo briefing (pedido/dúvida de mudança) + a leitura da IA.
export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const ia = typeof body?.ia === "string" && body.ia.trim() ? body.ia.trim() : undefined;

  if (!message) {
    return NextResponse.json({ ok: false, error: "empty_message" }, { status: 400, headers: noStore });
  }
  if (message.length > 4000) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400, headers: noStore });
  }

  const entry = await appendBriefingLog(request.headers, { message, ia });
  await appendAccessLog(request.headers, {
    event: "briefing_submitted",
    path: "/basecalculo",
    metadata: { id: entry.id },
  });

  return NextResponse.json({ ok: true, entry }, { headers: noStore });
}

// Apaga um briefing por id (qualquer sessão pode apagar).
export async function DELETE(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400, headers: noStore });
  }

  const removed = await deleteBriefingById(id);
  return NextResponse.json({ ok: true, removed }, { headers: noStore });
}
