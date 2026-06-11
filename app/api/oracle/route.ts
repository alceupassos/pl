import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/api-auth";
import { aiChat } from "@/lib/ai/client";

const noStore = { "Cache-Control": "no-store" };

// Insights determinísticos por seção (usados quando a IA não responde).
const HEURISTICAS: Record<string, string[]> = {
  dashboard: [
    "Concentre o esforço nas 3 regiões de maior voto esperado; cada ponto de cobertura ali rende mais que uma nova praça.",
    "A intenção sobe onde a cobertura passa de 70%. Priorize fechar a cobertura nas praças médias antes de abrir frentes novas.",
  ],
  noc: [
    "O líder presidencial puxa o discurso nacional, mas o voto local se decide no tema dominante da sua região. Alinhe os dois.",
    "Acompanhe a virada semanal: quem cresce em rejeição baixa é a real ameaça, não quem só tem intenção alta.",
  ],
  raiox: [
    "Fale do tema de maior oportunidade da região (alta demanda + baixa satisfação). É onde a mensagem converte voto mais rápido.",
    "Evite temas já saturados de satisfação alta — repetir o óbvio não move o eleitor indeciso.",
  ],
  meta: [
    "O gargalo está na conversão de cadastrado para engajado. Acione o QR nas comunidades para fechar o funil.",
    "Seu déficit de meta se concentra em poucas regiões. Realoque cabos para essas praças nas próximas duas semanas.",
  ],
  social: [
    "Engajamento positivo alto com crescimento indica espaço para amplificar. Replique os formatos que mais retêm.",
    "Onde o negativo cresce, responda com transparência rápida — silêncio vira narrativa do adversário.",
  ],
  territorios: [
    "Bairros com cobertura abaixo de 50% e eleitorado alto são o melhor retorno por real investido. Comece por eles.",
    "Use o mapa para cruzar cobertura baixa com tema sensível: ali a visita de campo vale por dez posts.",
  ],
  pesquisas: [
    "Dispare a próxima pesquisa para a base que menos respondeu — o dado que falta vale mais que confirmar o que já sabe.",
    "Compare ondas: variação dentro da margem não é tendência. Aja sobre movimentos consistentes em 2+ ondas.",
  ],
  // Seções do app mobile /m (v2).
  "m-ticker": [
    "O índice reage com um dia de atraso à imprensa; o spike de hoje vira manchete amanhã — prepare a resposta hoje.",
    "Variação sem volume de menções é ruído; só reaja a movimento com menções/min acima da média.",
  ],
  "m-plenario": [
    "Traição em votação simbólica antecipa racha na bancada — mapeie o voto antes de a pauta valer de verdade.",
    "Quando a oposição domina o share do debate, não dispute o tema do governo: imponha o seu na janela seguinte.",
  ],
  "m-rio": [
    "Região quente sem presença sua é palco do adversário; agende agenda física onde o pulso subiu dois dias seguidos.",
    "Equalizador evangélico alto com menção baixa a você é audiência disponível — ative os púlpitos parceiros.",
  ],
  "m-radar": [
    "Veículo com share alto e tom neutro é o melhor alvo de assessoria — neutro vira positivo com pauta exclusiva.",
    "Responda colunista crítico de alcance alto em até 24h; depois disso a versão dele vira a oficial.",
  ],
  "m-redes": [
    "Replique na rede que mais cresce o formato campeão da sua rede madura — crescimento composto barato.",
    "Concorrente crescendo 2x numa rede onde você é fraco: dispute agora ou ceda o território até a eleição.",
  ],
  "m-equipe": [
    "O gargalo está na conversão cadastrado→engajado; um líder de igreja ativado vale dez cabos avulsos.",
    "Realoque cabos da região que já bateu meta para a pior praça — custo zero, impacto imediato no funil.",
  ],
  "m-oportunidades": [
    "Tema com demanda alta e satisfação baixa É o discurso; valide com a manchete local antes de gravar.",
    "Bater na fraqueza do adversário só funciona ancorado em notícia publicada — sem fonte, vira ataque e volta contra você.",
  ],
  "m-pesquisas": [
    "Intenção alta com rejeição baixa é a ameaça real — monitore quem está nesse quadrante, não o líder do dia.",
    "Use a pesquisa própria para testar mensagem, não para medir voto: o painel próprio enviesa intenção.",
  ],
  "m-gastos": [
    "Rubrica em estouro no meio da campanha rouba o caixa do sprint final — corte agora ou prepare suplementação.",
    "Custo por voto acima do benchmark indica mídia mal segmentada; realoque do alcance amplo para o território-alvo.",
  ],
  "m-voz": [
    "Tema repetido por eleitores de bairros diferentes no mesmo dia é pauta emergente — responda antes da imprensa.",
    "Pico de negativas concentrado numa única fonte é ataque coordenado, não opinião pública; documente e exponha.",
  ],
  "m-c2026": [
    "Banda de confiança cruzando a do rival é empate técnico; gaste energia onde a separação é real.",
    "O quociente muda com o desempenho da legenda inteira — puxe o time, não só o seu número.",
  ],
};

function heuristica(section: string, context: string): string {
  const arr = HEURISTICAS[section] ?? [
    "Priorize a ação com maior retorno por esforço e meça o resultado na próxima semana.",
  ];
  let h = 0;
  const s = section + context;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return arr[h % arr.length];
}

export async function POST(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  }
  const body = await request.json().catch(() => ({}));
  const section = typeof body?.section === "string" ? body.section : "geral";
  const context = typeof body?.context === "string" ? body.context : "";

  let insight = "";
  try {
    const res = await aiChat(
      [
        {
          role: "system",
          content:
            "Você é um estrategista eleitoral sênior. Responda em português do Brasil, com 1 a 2 frases curtas, diretas e acionáveis. Sem saudações, sem rótulos, apenas o conselho.",
        },
        {
          role: "user",
          content: `Seção do painel: ${section}. Contexto: ${context}. Dê um insight estratégico específico para a campanha agora.`,
        },
      ],
      { temperature: 0.6, maxTokens: 120 },
    );
    if (res.ok && res.text.trim()) insight = res.text.trim();
  } catch {
    /* cai no fallback */
  }
  if (!insight) insight = heuristica(section, context);

  // Nunca expõe o provedor de IA.
  return NextResponse.json({ insight }, { headers: noStore });
}
