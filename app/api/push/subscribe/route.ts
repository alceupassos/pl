// Registro de subscriptions de Web Push do /m.
// GET devolve a chave pública VAPID (ou null — push desativado).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/api-auth";
import { getVapidPublicKey, removeSubscription, saveSubscription } from "@/lib/push";

export const runtime = "nodejs";

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  return NextResponse.json({ publicKey: getVapidPublicKey() }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  const parsed = SubscriptionSchema.safeParse(body?.subscription ?? body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 422, headers: noStore });
  }
  await saveSubscription(parsed.data);
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : null;
  if (!endpoint) {
    return NextResponse.json({ error: "missing_endpoint" }, { status: 422, headers: noStore });
  }
  await removeSubscription(endpoint);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
