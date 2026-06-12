// Alerta WhatsApp a cada acesso — via whatsgate local ou webhook configurável.
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

export async function notifyAccess(entry: AccessLogEntry): Promise<void> {
  const url = process.env.WHATSGATE_URL?.trim();
  if (!url) return;

  const to = (process.env.ACCESS_WHATSAPP_TO || DEFAULT_TO).replace(/\D/g, "");
  const token = process.env.WHATSGATE_TOKEN?.trim();
  const message = formatMessage(entry);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to,
        phone: to,
        number: to,
        message,
        text: message,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[whatsapp-push] HTTP ${res.status}`);
    }
  } catch (error) {
    console.warn("[whatsapp-push] falha ao enviar:", error instanceof Error ? error.message : "erro");
  }
}
