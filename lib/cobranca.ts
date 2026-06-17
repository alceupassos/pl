// Geração das mensagens de cobrança/resposta por IA (reusada por /api/cobranca/*
// e pelo webhook de entrada). Usa o cliente único lib/ai/client.ts (grok→fallback).

import { aiChat } from "@/lib/ai/client";
import type { Conversa } from "@/lib/conversas";
import { NIVEL_LABEL, pctCadastro, type Membro } from "@/lib/organizadores";

const SYSTEM =
  "Você é o coordenador de metas da campanha do deputado Sóstenes Cavalcante (PL-RJ). " +
  "Fale em português do Brasil, tom firme, respeitoso e motivador, direto ao ponto. " +
  "Mensagens curtas de WhatsApp (no máximo 2-3 frases). Sem markdown; no máximo 1 emoji. " +
  "Você acompanha e cobra as metas de cadastro de eleitores da rede de campanha " +
  "(gerentes, cabos eleitorais, líderes religiosos e deputados estaduais).";

function contexto(m: Membro): string {
  const falta = Math.max(0, (m.metas?.cadastro ?? 0) - (m.avancos?.cadastro ?? 0));
  return (
    `Membro: ${m.nome} (${NIVEL_LABEL[m.nivel]}${m.regiao ? `, ${m.regiao}` : ""}). ` +
    `Meta de cadastro: ${m.metas?.cadastro ?? 0}. Já cadastrou: ${m.avancos?.cadastro ?? 0} ` +
    `(${pctCadastro(m)}% da meta; faltam ${falta}).`
  );
}

function fallbackCobranca(m: Membro): string {
  const falta = Math.max(0, (m.metas?.cadastro ?? 0) - (m.avancos?.cadastro ?? 0));
  const primeiro = m.nome.split(" ")[0];
  return `Olá, ${primeiro}! Como está o cadastro de eleitores? Faltam ${falta} para a sua meta. Bora avançar essa semana? 💪`;
}

/** Gera UMA mensagem de cobrança da meta para o membro. */
export async function gerarCobranca(m: Membro): Promise<string> {
  const res = await aiChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${contexto(m)}\n\nEscreva UMA mensagem de WhatsApp cobrando o avanço da meta de cadastro, de forma motivadora.`,
      },
    ],
    { temperature: 0.6, maxTokens: 160 },
  );
  return res.ok && res.text.trim() ? res.text.trim() : fallbackCobranca(m);
}

/** Gera a resposta da IA a uma mensagem recebida do membro (conversa 2 vias). */
export async function gerarResposta(
  m: Membro,
  historico: Conversa[],
  recebida: string,
): Promise<string> {
  const hist = historico.map(
    (c) =>
      ({
        role: c.direcao === "out" ? "assistant" : "user",
        content: c.texto,
      }) as const,
  );
  const res = await aiChat(
    [
      {
        role: "system",
        content: `${SYSTEM} Responda à mensagem do membro de forma útil, mantendo o foco em destravar e cobrar a meta de cadastro.`,
      },
      { role: "user", content: contexto(m) },
      ...hist,
      { role: "user", content: recebida },
    ],
    { temperature: 0.6, maxTokens: 200 },
  );
  return res.ok && res.text.trim()
    ? res.text.trim()
    : "Recebido! Conta comigo. Como está o cadastro hoje?";
}
