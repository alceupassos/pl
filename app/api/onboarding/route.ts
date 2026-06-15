import { NextRequest, NextResponse } from "next/server";

import { appendOnboardingLog } from "@/lib/onboarding-log";

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

  if (!nome || !cidade || !whatsapp) {
    return NextResponse.json(
      { saved: false, error: "missing_required_fields" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
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
  const token = process.env.WHATSGATE_TOKEN?.trim();
  const sessionId = process.env.WHATSGATE_SESSION_ID?.trim();
  if (!token || !sessionId) return;

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
    `Local: ${data.cidade} · ${data.uf}`,
    `Perfil: ${situacaoLabel}`,
    `WhatsApp: ${data.whatsapp}`,
    data.email ? `Email: ${data.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const base = (
    process.env.WHATSGATE_BASE_URL || "http://127.0.0.1:2785"
  ).replace(/\/$/, "");
  await fetch(
    `${base}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": token },
      body: JSON.stringify({ chatId: `${to}@c.us`, text: message }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => undefined);
}
