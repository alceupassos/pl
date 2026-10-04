import { NextRequest, NextResponse } from "next/server";
import { getTelaoSession as getSession } from "@/lib/telao/registro";
import { heartbeat, presenceSummary } from "@/lib/telao/presence";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) { const session = getSession(req); if (!session?.sub) return NextResponse.json({error:"unauthorized"},{status:401,headers}); await heartbeat(session.sub, req.headers); return NextResponse.json({ok:true},{headers}); }
export async function GET(req: NextRequest) { const session = getSession(req); if (!session) return NextResponse.json({error:"unauthorized"},{status:401,headers}); return NextResponse.json(await presenceSummary(),{headers}); }
