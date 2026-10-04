// Perfil do Candidato & Notificações Push de Resultados (Eleições 2026)
//
// Permite ativar o cadastro 1x no dia com: Nome, Email, WhatsApp, Número e Território.
// O cadastro fica salvo em data/candidato-perfil.json (acessível por múltiplos computadores).
// Sempre que a apuração atualizar, envia alertas Push (WebPush + WhatsApp) com:
// - Posição atual no pleito
// - % dos votos válidos e total de votos
// - Distância para o líder e para a margem de eleição
// - Posição dos concorrentes diretos (primeiros e próximos).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { sendPushToAll } from "@/lib/push";
import { getApuracao, isPleitoId, type Apuracao, type CandApurado, type PleitoId } from "@/lib/telao/tse-apuracao";
import { sendWhatsappText } from "@/lib/whatsapp-push";

export type PerfilCandidato = {
  nome: string;
  email: string;
  whatsapp: string;
  numero: number;
  cargo: PleitoId;
  uf: string;
  territorio: string; // região/bairros/cidades percorridos
  ativadoEm: string; // ISO timestamp
  ultimoPushKey?: string; // dedupe de notificações
};

const FILE = path.join(process.cwd(), "data", "candidato-perfil.json");

export async function getPerfilCandidato(): Promise<PerfilCandidato | null> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as PerfilCandidato;
  } catch {
    return null;
  }
}

export async function savePerfilCandidato(p: Partial<PerfilCandidato>): Promise<PerfilCandidato> {
  const atual = (await getPerfilCandidato()) ?? {
    nome: "",
    email: "",
    whatsapp: "",
    numero: 0,
    cargo: "dep-federal-sp",
    uf: "sp",
    territorio: "",
    ativadoEm: new Date().toISOString(),
  };

  const s = (v: unknown, max = 100) => String(v ?? "").trim().slice(0, max);
  const n = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));

  const novo: PerfilCandidato = {
    nome: s(p.nome ?? atual.nome, 60),
    email: s(p.email ?? atual.email, 80),
    whatsapp: s(p.whatsapp ?? atual.whatsapp, 25).replace(/\D/g, ""),
    numero: n(p.numero ?? atual.numero),
    cargo: isPleitoId(String(p.cargo)) ? (p.cargo as PleitoId) : atual.cargo,
    uf: s(p.uf ?? atual.uf, 2).toLowerCase() || "sp",
    territorio: s(p.territorio ?? atual.territorio, 200),
    ativadoEm: new Date().toISOString(),
    ultimoPushKey: atual.ultimoPushKey,
  };

  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(novo, null, 2), "utf8");
  return novo;
}

/** Verifica se a ativação foi realizada na data de hoje (YYYY-MM-DD). */
export function foiAtivadoHoje(p?: PerfilCandidato | null): boolean {
  if (!p?.ativadoEm) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return p.ativadoEm.slice(0, 10) === hoje;
}

/**
 * Dispara notificação push de apuração se houver novidade na posição ou votos do candidato.
 */
export async function checarPushResultado(): Promise<{ notificado: boolean; mensagem?: string }> {
  const p = await getPerfilCandidato();
  if (!p || !p.numero) return { notificado: false };

  const ap = await getApuracao(p.cargo, { uf: p.uf });
  if (ap.status === "aguardando" || !ap.cand.length) return { notificado: false };

  const numStr = String(p.numero);
  const candIndex = ap.cand.findIndex((c) => c.num === numStr);
  if (candIndex < 0) return { notificado: false };

  const cand = ap.cand[candIndex];
  const pos = candIndex + 1;
  const lider = ap.cand[0];
  const prox = candIndex > 0 ? ap.cand[candIndex - 1] : ap.cand[1];
  const dentro = pos <= ap.vagas;

  // chave de dedupe: urnas + posição + votos do candidato
  const key = `${ap.pctUrnas.toFixed(1)}|${pos}|${cand.votos}`;
  if (p.ultimoPushKey === key) return { notificado: false };

  // Atualiza chave no perfil
  p.ultimoPushKey = key;
  await writeFile(FILE, JSON.stringify(p, null, 2), "utf8").catch(() => {});

  const nf = (n: number) => Math.round(n).toLocaleString("pt-BR");
  const pctf = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const titulo = `📊 ${pos}º Lugar (${cand.partido}) · ${pctf(cand.pct)}% dos votos`;
  const statusVagas = dentro
    ? (ap.vagas > 1 ? `✅ Dentro das ${ap.vagas} vagas!` : "🥇 Liderando no 1º turno!")
    : `⚠️ Fora das vagas (vaga nº ${ap.vagas}: ${pctf(ap.cand[ap.vagas - 1]?.pct ?? 0)}%)`;

  const compText = prox && prox.num !== cand.num
    ? ` · ${pos > 1 ? `Atrás de ${prox.nome} (${pctf(prox.pct)}%)` : `À frente de ${prox.nome} (${pctf(prox.pct)}%)`}`
    : "";

  const corpo = `${statusVagas}\nVotos: ${nf(cand.votos)} (${pctf(cand.pct)}%) · Urnas apuradas: ${pctf(ap.pctUrnas)}%${compText}`;

  // 1. Send WebPush
  await sendPushToAll({
    id: `result-${key}`,
    titulo: `${p.nome || `Candidato ${p.numero}`}: ${titulo}`,
    corpo,
    tab: "apuracao",
  });

  // 2. Send WhatsApp if phone registered
  if (p.whatsapp) {
    const zapMsg = `🚨 *APURAÇÃO TSE — RESULTADO AO VIVO*\n\n` +
      `👤 *${p.nome || `Candidato ${p.numero}`}* (${p.numero})\n` +
      `📍 Posição: *${pos}º Lugar*\n` +
      `🗳️ Votos: *${nf(cand.votos)}* (${pctf(cand.pct)}% dos válidos)\n` +
      `⚡ Urnas: *${pctf(ap.pctUrnas)}%*\n` +
      `🏆 Líder: *${lider.nome}* (${lider.partido}) com ${pctf(lider.pct)}%\n\n` +
      `${statusVagas}\n\n` +
      `_Acompanhe em tempo real em candidato.angra.io/c_`;
    await sendWhatsappText(p.whatsapp, zapMsg).catch(() => {});
  }

  return { notificado: true, mensagem: `${titulo}: ${corpo}` };
}
