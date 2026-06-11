// Watchlist do /m — GET para leitura, PUT para o admin de /m/config.
// PUT valida com o mesmo WatchlistSchema usado na leitura.

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/api-auth";
import { readWatchlist, writeWatchlist } from "@/lib/watchlist";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  return NextResponse.json(await readWatchlist(), { headers: noStore });
}

export async function PUT(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const body = await request.json().catch(() => null);
  try {
    const saved = await writeWatchlist(body);
    return NextResponse.json(saved, { headers: noStore });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "invalid_watchlist", issues: error.issues },
        { status: 422, headers: noStore },
      );
    }
    return NextResponse.json({ error: "write_failed" }, { status: 500, headers: noStore });
  }
}
