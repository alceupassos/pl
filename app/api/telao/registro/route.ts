import { NextRequest, NextResponse } from "next/server";

import { getAuthCookieName, getClientIp, verifySession } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { appendRecord } from "@/lib/store";
import { TELAO_REG_COOKIE, TELAO_REG_TTL, assinarRegistro, lerRegistro } from "@/lib/telao/registro";

const NO_STORE = { "Cache-Control": "no-store" };

// GET: o visitante pode ver o telão? (login do cockpit OU registro do telão)
export async function GET(request: NextRequest) {
  const sessao = verifySession(request.cookies.get(getAuthCookieName())?.value, request.headers);
  if (sessao) return NextResponse.json({ ok: true, cockpit: true }, { headers: NO_STORE });
  const reg = lerRegistro(request.cookies.get(TELAO_REG_COOKIE)?.value);
  if (reg) return NextResponse.json({ ok: true, cockpit: false, nome: reg.nome }, { headers: NO_STORE });
  return NextResponse.json({ ok: false }, { status: 401, headers: NO_STORE });
}

// POST: registro com nome + WhatsApp (+ partidos escolhidos). Sem senha.
export async function POST(request: NextRequest) {
  let body: { nome?: unknown; whatsapp?: unknown; partidos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Envio inválido. Tente de novo." }, { status: 400 });
  }
  const nome = String(body.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (nome.length < 2) {
    return NextResponse.json({ ok: false, erro: "Digite seu nome." }, { status: 400 });
  }
  const tel = normalizePhone(String(body.whatsapp ?? ""));
  if (!tel.ok) {
    return NextResponse.json(
      { ok: false, erro: "WhatsApp inválido. Use DDD + número, ex.: (11) 91234-5678." },
      { status: 400 },
    );
  }
  const partidos = Array.isArray(body.partidos)
    ? body.partidos.filter((p): p is string => typeof p === "string").slice(0, 12).map((p) => p.slice(0, 20))
    : [];

  await appendRecord("telao-registros", "treg", {
    nome,
    whatsapp: tel.phone,
    partidos,
    ip: getClientIp(request.headers),
    ua: request.headers.get("user-agent")?.slice(0, 200) ?? "",
  });

  const res = NextResponse.json({ ok: true, nome }, { headers: NO_STORE });
  res.cookies.set({
    name: TELAO_REG_COOKIE,
    value: assinarRegistro(nome, tel.phone),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TELAO_REG_TTL,
  });
  return res;
}
