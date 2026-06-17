import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { appendAccessLog, appendLeadLog, lookupIpLocation } from "@/lib/access-log";
import { getSession } from "@/lib/api-auth";
import { getClientIp } from "@/lib/auth";
import { verifyPhoneToken } from "@/lib/phone";

const LEAD_EMAIL = "eleicao@angra.io";

// Contagem de leads (autenticada) para o painel de Meta de Votos.
export async function GET(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  let count = 0;
  try {
    const content = await readFile(
      path.join(process.cwd(), "data", "transparency-leads.jsonl"),
      "utf8",
    );
    count = content.split("\n").filter(Boolean).length;
  } catch {
    count = 0;
  }
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function sendLeadEmail(lead: {
  nomeCompleto: string;
  email: string;
  whatsapp: string;
  cidade: string;
  estado: string;
}) {
  const formData = new FormData();
  formData.set("name", lead.nomeCompleto);
  formData.set("email", lead.email);
  formData.set("whatsapp", lead.whatsapp);
  formData.set("cidade", lead.cidade);
  formData.set("estado", lead.estado);
  formData.set(
    "message",
    [
      "Novo lead do modal de transparencia da landing politica.angra.io",
      "",
      `Nome: ${lead.nomeCompleto}`,
      `Email: ${lead.email}`,
      `WhatsApp: ${lead.whatsapp}`,
      `Cidade: ${lead.cidade}`,
      `Estado: ${lead.estado}`,
    ].join("\n"),
  );
  formData.set("_subject", "Novo lead da landing politica.angra.io");
  formData.set("_replyto", lead.email);
  formData.set("_template", "table");
  formData.set("_captcha", "false");

  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(LEAD_EMAIL)}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    },
  );

  const body = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    provider: "formsubmit",
    body,
    status: response.status,
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const lead = {
    nomeCompleto:
      typeof body?.nomeCompleto === "string" ? body.nomeCompleto.trim() : "",
    email: typeof body?.email === "string" ? body.email.trim() : "",
    whatsapp: typeof body?.whatsapp === "string" ? body.whatsapp.trim() : "",
    cidade: typeof body?.cidade === "string" ? body.cidade.trim() : "",
    estado: typeof body?.estado === "string" ? body.estado.trim() : "",
    consentimentoLgpd: body?.consentimentoLgpd === true,
    destinationEmail: LEAD_EMAIL,
  };

  if (!lead.nomeCompleto || !lead.email || !lead.whatsapp) {
    return NextResponse.json(
      {
        saved: false,
        error: "missing_required_fields",
      },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  // Só salva após o número ter sido confirmado por código no WhatsApp.
  if (!verifyPhoneToken(body?.verifyToken, lead.whatsapp)) {
    return NextResponse.json(
      { saved: false, error: "unverified" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  // IP + geolocalização para cruzar o lead com os dados de acesso (mesma chave IP).
  const ip = getClientIp(request.headers);
  const loc = await lookupIpLocation(ip);
  const localEntry = await appendLeadLog({
    ...lead,
    ip,
    city: loc.city,
    region: loc.region,
    country: loc.country,
  });
  await appendAccessLog(request.headers, {
    event: "transparency_lead_submitted",
    path: "/api/transparency-lead",
    metadata: {
      email: lead.email,
      cidade: lead.cidade,
      estado: lead.estado,
    },
  });

  const supabase = getSupabaseClient();
  let supabaseSaved = false;
  let supabaseError: string | null = null;
  let emailSent = false;
  let emailProvider = "formsubmit";
  let emailError: string | null = null;

  if (supabase) {
    const { error } = await supabase.from("transparency_leads").insert({
      nome_completo: lead.nomeCompleto,
      email: lead.email,
      whatsapp: lead.whatsapp,
      cidade: lead.cidade,
      estado: lead.estado,
      consentimento_lgpd: lead.consentimentoLgpd,
      destination_email: LEAD_EMAIL,
    });

    supabaseSaved = !error;
    supabaseError = error?.message || null;
  }

  const emailResult = await sendLeadEmail(lead).catch((error: unknown) => ({
    ok: false,
    provider: "formsubmit",
    body: null,
    status: 500,
    error: error instanceof Error ? error.message : "unknown_email_error",
  }));

  emailSent = emailResult.ok;
  emailProvider = emailResult.provider;
  emailError =
    "error" in emailResult
      ? emailResult.error
      : emailResult.ok
        ? null
        : typeof emailResult.body === "object" &&
            emailResult.body !== null &&
            "message" in emailResult.body &&
            typeof emailResult.body.message === "string"
          ? emailResult.body.message
          : `email_send_failed_${emailResult.status}`;

  await appendAccessLog(request.headers, {
    event: emailSent
      ? "transparency_lead_email_sent"
      : "transparency_lead_email_failed",
    path: "/api/transparency-lead",
    metadata: {
      email: lead.email,
      provider: emailProvider,
      error: emailError,
    },
  });

  if (!emailSent) {
    return NextResponse.json(
      {
        saved: false,
        destinationEmail: LEAD_EMAIL,
        localEntry,
        supabaseSaved,
        supabaseError,
        emailSent,
        emailProvider,
        emailError,
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      saved: true,
      destinationEmail: LEAD_EMAIL,
      localEntry,
      supabaseSaved,
      supabaseError,
      emailSent,
      emailProvider,
      emailError,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
