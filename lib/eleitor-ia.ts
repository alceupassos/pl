// IA de engajamento do Eleitor Ativo (boas-vindas + pesquisa + preparação de
// campanha). Usa o cliente único lib/ai/client.ts (grok→fallback).

import { aiChat } from "@/lib/ai/client";
import type { Conversa } from "@/lib/conversas";
import type { Eleitor } from "@/lib/eleitores";

const SYSTEM =
  "Você é o assistente de pesquisa e mobilização da campanha do deputado Sóstenes Cavalcante (PL-RJ). " +
  "Fala com eleitores no WhatsApp, em português do Brasil, tom acolhedor, próximo e respeitoso. " +
  "Mensagens curtas (2-3 frases), no máximo 1 emoji, sem markdown. " +
  "Seu objetivo: dar boas-vindas, fazer UMA pergunta de pesquisa por vez (temas/prioridades da " +
  "região, intenção de voto, o que o eleitor espera), e convidar a participar da preparação da " +
  "campanha. Nunca peça dados sensíveis (CPF, senha, dinheiro).";

function ctx(e: Eleitor): string {
  return `Eleitor: ${e.nome}${e.cidade ? ` (${e.cidade})` : ""}.`;
}

export async function gerarBoasVindas(e: Eleitor, caboNome?: string): Promise<string> {
  const res = await aiChat(
    [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          `${ctx(e)} ${caboNome ? `Foi indicado por ${caboNome}. ` : ""}` +
          "Escreva a PRIMEIRA mensagem de boas-vindas: agradeça o cadastro, apresente-se como a equipe " +
          "do Sóstenes e faça UMA pergunta simples de pesquisa sobre a prioridade dele para a região.",
      },
    ],
    { temperature: 0.7, maxTokens: 180 },
  );
  return res.ok && res.text.trim()
    ? res.text.trim()
    : `Olá, ${e.nome.split(" ")[0]}! Aqui é a equipe do deputado Sóstenes Cavalcante. Obrigado por se cadastrar! 🙏 Qual é a maior prioridade pra sua região hoje?`;
}

export async function gerarRespostaEleitor(
  e: Eleitor,
  historico: Conversa[],
  recebida: string,
): Promise<string> {
  const hist = historico.map(
    (c) => ({ role: c.direcao === "out" ? "assistant" : "user", content: c.texto }) as const,
  );
  const res = await aiChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: ctx(e) },
      ...hist,
      { role: "user", content: recebida },
    ],
    { temperature: 0.7, maxTokens: 200 },
  );
  return res.ok && res.text.trim()
    ? res.text.trim()
    : "Que ótimo receber sua mensagem! Conta pra gente: o que você mais gostaria de ver melhorar na sua região?";
}
