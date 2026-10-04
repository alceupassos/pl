import { NextRequest, NextResponse } from "next/server";

import { verifyAltchaPayload } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const payload = typeof body?.payload === "string" ? body.payload : "";
  const verification = await verifyAltchaPayload(payload);

  return NextResponse.json(
    {
      verified: verification.verified,
      reason: verification.reason,
      payload: verification.verified ? payload : undefined,
    },
    {
      status: verification.verified ? 200 : 400,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
