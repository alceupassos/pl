// Alerta WhatsApp a cada acesso — via whatsgate (OpenWA) ou webhook genérico.
// Não bloqueia o fluxo principal; falhas são silenciosas no servidor.

import type { AccessLogEntry } from "@/lib/access-log";

const DEFAULT_TO = "5511972322293";

function formatMessage(entry: AccessLogEntry): string {
  const when = new Date(entry.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const login =
    typeof entry.metadata?.login === "string" ? entry.metadata.login : "";
  const lines = [
    "🔔 Novo acesso no cockpit",
    `Evento: ${entry.event}`,
    `IP: ${entry.ip}`,
    `Local: ${entry.city}${entry.region ? ` · ${entry.region}` : ""}`,
    `Path: ${entry.path}`,
    `Data: ${when}`,
  ];
  if (login) lines.push(`Login: ${login}`);
  return lines.join("\n");
}

function whatsappChatId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.includes("@") ? digits : `${digits}@c.us`;
}

async function postWhatsgateText(message: string, to: string): Promise<void> {
  const token = process.env.WHATSGATE_TOKEN?.trim();
  const sessionId = process.env.WHATSGATE_SESSION_ID?.trim();
  const base = (process.env.WHATSGATE_BASE_URL || "http://127.0.0.1:2785").replace(/\/$/, "");

  if (!token || !sessionId) return;

  const url = `${base}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token,
    },
    body: JSON.stringify({
      chatId: whatsappChatId(to),
      text: message,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.warn(`[whatsapp-push] whatsgate HTTP ${res.status}`);
  }
}

async function postGenericWebhook(message: string, to: string): Promise<void> {
  const url = process.env.WHATSGATE_URL?.trim();
  if (!url) return;

  const token = process.env.WHATSGATE_TOKEN?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-API-Key"] = token;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      to,
      phone: to,
      number: to,
      message,
      text: message,
      chatId: whatsappChatId(to),
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.warn(`[whatsapp-push] webhook HTTP ${res.status}`);
  }
}

export async function notifyAccess(entry: AccessLogEntry): Promise<void> {
  const to = (process.env.ACCESS_WHATSAPP_TO || DEFAULT_TO).replace(/\D/g, "");
  const message = formatMessage(entry);

  try {
    if (process.env.WHATSGATE_SESSION_ID?.trim() && process.env.WHATSGATE_TOKEN?.trim()) {
      await postWhatsgateText(message, to);
      return;
    }
    await postGenericWebhook(message, to);
  } catch (error) {
    console.warn("[whatsapp-push] falha ao enviar:", error instanceof Error ? error.message : "erro");
  }
}
