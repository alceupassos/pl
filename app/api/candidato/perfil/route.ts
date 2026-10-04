import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/api-auth";
import { checarPushResultado, foiAtivadoHoje, getPerfilCandidato, savePerfilCandidato } from "@/lib/telao/candidato-push";
import { isPleitoId } from "@/lib/telao/tse-apuracao";
import { isUF } from "@/lib/telao/ufs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const profileSchema = z.object({
  nome: z.string().trim().min(2).max(60), email: z.email().max(80),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13),
  numero: z.number().int().min(10).max(99999), cargo: z.string().refine(isPleitoId),
  uf: z.string().toLowerCase().refine(isUF), territorio: z.string().trim().max(200).optional().default(""),
});
export async function GET(request: NextRequest) {
  if (!getSession(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const profile = await getPerfilCandidato();
  return NextResponse.json({ perfil: profile, ativadoHoje: foiAtivadoHoje(profile) }, { headers: noStore });
}
export async function POST(request: NextRequest) {
  if (!getSession(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile" }, { status: 422, headers: noStore });
  try {
    const profile = await savePerfilCandidato(parsed.data);
    checarPushResultado().catch(() => {});
    return NextResponse.json({ ok: true, perfil: profile, ativadoHoje: true }, { headers: noStore });
  } catch { return NextResponse.json({ error: "save_failed" }, { status: 500, headers: noStore }); }
}
