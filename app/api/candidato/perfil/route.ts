import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTelaoSession as getSession } from "@/lib/telao/registro";
import { checarPushResultado, foiAtivadoHoje, getPerfilCandidato, savePerfilCandidato } from "@/lib/telao/candidato-push";
import { isPleitoId } from "@/lib/telao/tse-apuracao";
import { normalizePhone, verifyPhoneToken } from "@/lib/phone";
import { isUF } from "@/lib/telao/ufs";
export const dynamic = "force-dynamic";
const verificationRequired = process.env.WHATSAPP_VERIFY_ENABLED === "true";
const noStore = { "Cache-Control": "no-store" };
const profileSchema = z.object({
  phoneToken: z.string().max(2000).optional(),
  nome: z.string().trim().min(2).max(60), email: z.email().max(80),
  whatsapp: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length >= 10 && v.length <= 13),
  numero: z.number().int().min(10).max(99999), cargo: z.string().refine(isPleitoId),
  uf: z.string().toLowerCase().refine(isUF), territorio: z.string().trim().max(200).optional().default(""),
});
export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  let profile = await getPerfilCandidato(session.credentialType === "main" ? undefined : session.sub);
  if (!profile && session.credentialType === "registered") profile = { nome: session.nome, email: "", whatsapp: session.phone, verifiedPhone: session.verifiedAt ? session.phone : undefined, whatsappVerifiedAt: session.verifiedAt, numero: 0, cargo: "dep-federal-sp", uf: "sp", territorio: "", ativadoEm: "" };
  return NextResponse.json({ perfil: profile, ativadoHoje: foiAtivadoHoje(profile), verificationRequired }, { headers: noStore });
}
export async function POST(request: NextRequest) {
  const session = getSession(request);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile" }, { status: 422, headers: noStore });
  try {
    const owner = session.credentialType === "main" ? undefined : session.sub;
    if (session.credentialType !== "main" && !owner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const norm = normalizePhone(parsed.data.whatsapp);
    if (!norm.ok) return NextResponse.json({ error: "invalid_phone" }, { status: 422 });
    const current = await getPerfilCandidato(owner);
    const registrationVerified = session.credentialType === "registered" && !!session.verifiedAt && session.phone === norm.phone;
    const alreadyVerified = current?.verifiedPhone === norm.phone && !!current.whatsappVerifiedAt || registrationVerified;
    if (verificationRequired && !alreadyVerified && !verifyPhoneToken(parsed.data.phoneToken, norm.phone, session.sub)) return NextResponse.json({ error: "phone_verification_required" }, { status: 403, headers: noStore });
    const proved = alreadyVerified || verifyPhoneToken(parsed.data.phoneToken, norm.phone, session.sub);
    const { phoneToken: _token, ...values } = parsed.data;
    const profile = await savePerfilCandidato({ ...values, whatsapp: norm.phone, verifiedPhone: proved ? norm.phone : undefined, whatsappVerifiedAt: !proved ? undefined : alreadyVerified ? (current?.whatsappVerifiedAt ?? (session.credentialType === "registered" ? session.verifiedAt : new Date().toISOString())) : new Date().toISOString() }, owner);
    if (!owner) checarPushResultado().catch(() => {});
    return NextResponse.json({ ok: true, perfil: profile, ativadoHoje: true }, { headers: noStore });
  } catch { return NextResponse.json({ error: "save_failed" }, { status: 500, headers: noStore }); }
}
