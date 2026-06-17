import { NextRequest, NextResponse } from "next/server";

import { appendOnboardingLog } from "@/lib/onboarding-log";
import { verifyPhoneToken } from "@/lib/phone";
import { sendWhatsappText } from "@/lib/whatsapp-push";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const cidade = typeof body?.cidade === "string" ? body.cidade.trim() : "";
  const uf = typeof body?.uf === "string" ? body.uf.trim().toUpperCase() : "";
  const situacao = ["candidato", "politica", "outro"].includes(body?.situacao)
    ? (body.situacao as "candidato" | "politica" | "outro")
    : "outro";
  const whatsapp =
    typeof body?.whatsapp === "string" ? body.whatsapp.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const pergunta =
    typeof body?.pergunta === "string" ? body.pergunta.trim() : "";
  const uid = typeof body?.uid === "string" ? body.uid.trim() : "";

  if (!nome || !whatsapp || !email) {
    return NextResponse.json(
      { saved: false, error: "missing_required_fields" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Só salva após o número ter sido confirmado por código no WhatsApp.
  if (!verifyPhoneToken(body?.verifyToken, whatsapp)) {
    return NextResponse.json(
      { saved: false, error: "unverified" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ip = getClientIp(request);
  await appendOnboardingLog(
    { uid, nome, cidade, uf, situacao, whatsapp, email, pergunta },
    ip,
  );

  // Notificação WhatsApp assíncrona (não bloqueia)
  notifyOnboarding({ nome, cidade, uf, situacao, whatsapp, email }).catch(
    () => undefined,
  );

  return NextResponse.json(
    { saved: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function notifyOnboarding(data: {
  nome: string;
  cidade: string;
  uf: string;
  situacao: string;
  whatsapp: string;
  email: string;
}): Promise<void> {
  const to = (process.env.ACCESS_WHATSAPP_TO || "5511972322293").replace(
    /\D/g,
    "",
  );
  const situacaoLabel =
    data.situacao === "candidato"
      ? "Candidato(a)"
      : data.situacao === "politica"
        ? "Trabalha com política"
        : "Outro";

  const message = [
    "📋 Novo cadastro no Cockpit /m",
    `Nome: ${data.nome}`,
    data.cidade || data.uf ? `Local: ${data.cidade} · ${data.uf}` : null,
    `Perfil: ${situacaoLabel}`,
    `WhatsApp: ${data.whatsapp}`,
    data.email ? `Email: ${data.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendWhatsappText(to, message);
}
