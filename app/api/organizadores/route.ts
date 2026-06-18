import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { countByCabo } from "@/lib/eleitores";
import {
  addMembro,
  deleteMembro,
  listMembros,
  patchMembro,
} from "@/lib/organizadores";

const noStore = { "Cache-Control": "no-store" };

function unauth() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
}

export async function GET(request: NextRequest) {
  if (!getSession(request)) return unauth();
  const [membros, eleitoresPorCabo] = await Promise.all([listMembros(), countByCabo()]);
  return NextResponse.json({ membros, eleitoresPorCabo }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!getSession(request)) return unauth();
  const body = await request.json().catch(() => ({}));
  if (!body?.nome || !body?.nivel) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: noStore });
  }
  try {
    const membro = await addMembro(body);
    return NextResponse.json({ membro }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: noStore });
  }
}

export async function PATCH(request: NextRequest) {
  if (!getSession(request)) return unauth();
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: noStore });
  }
  const { id: _omit, ...patch } = body;
  void _omit;
  try {
    const membro = await patchMembro(id, patch);
    if (!membro) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
    return NextResponse.json({ membro }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: noStore });
  }
}

export async function DELETE(request: NextRequest) {
  if (!getSession(request)) return unauth();
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers: noStore });
  }
  const ok = await deleteMembro(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404, headers: noStore });
}
