import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/api-auth";

import { appendAccessLog, summarizeAccessLogs } from "@/lib/access-log";

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session || session.credentialType !== "main") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await summarizeAccessLogs();

  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const event = typeof body?.event === "string" ? body.event : "page_view";
  const path = typeof body?.path === "string" ? body.path : "/";
  const metadata =
    body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  await appendAccessLog(request.headers, {
    event,
    path,
    metadata,
  });

  return NextResponse.json(
    {
      logged: true,

    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
