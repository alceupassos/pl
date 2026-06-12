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

const LEITURAS_FALLBACK: Record<string, string[]> = {
  "m-ticker": [
    "O painel resume imprensa, sentimento, base online e buzz num único termômetro — o movimento de hoje antecipa a narrativa de amanhã.",
    "A comparação com concorrentes mostra quem ganha relevância na disputa local, não só quem tem mais seguidores.",
  ],
  "m-redes": [
    "Cada rede social reage a formatos diferentes; crescimento de seguidores sem engajamento é vaidade, não voto.",
    "O share de veículos indica quem está puxando a cobertura — neutro é oportunidade de assessoria.",
  ],
  geral: [
    "Os números deste gráfico indicam o ritmo atual da campanha — acompanhe a tendência antes de reagir.",
    "O dado isolado não define eleição; o padrão de vários dias sim.",
  ],
};

function hashPick(key: string, arr: string[]): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  return arr[h % arr.length];
}

function sectionFromCard(card: string): string {
  const prefix = card.split("-")[0];
  const map: Record<string, string> = {
    ticker: "m-ticker",
    redes: "m-redes",
    equipe: "m-equipe",
    gastos: "m-gastos",
    oportunidades: "m-oportunidades",
    pesquisas: "m-pesquisas",
    plenario: "m-plenario",
    radar: "m-radar",
    rio: "m-rio",
    voz: "m-voz",
    c2026: "m-c2026",
  };
  return map[prefix] ?? "geral";
}

function heuristica(section: string, context: string): string {
  const arr = HEURISTICAS[section] ?? [
    "Priorize a ação com maior retorno por esforço e meça o resultado na próxima semana.",
  ];
  return hashPick(section + context, arr);
}

function heuristicaLeitura(card: string, context: string): { leitura: string; dica: string } {
  const section = sectionFromCard(card);
  const leituras = LEITURAS_FALLBACK[section] ?? LEITURAS_FALLBACK.geral;
  return {
    leitura: hashPick(`L:${card}:${context}`, leituras),
    dica: heuristica(section, context),
  };
}

function parseLeituraJson(text: string): { leitura: string; dica: string } | null {
  try {
    const raw = text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) return null;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
      leitura?: unknown;
      dica?: unknown;
    };
    if (typeof parsed.leitura !== "string" || typeof parsed.dica !== "string") return null;
    const leitura = parsed.leitura.trim();
    const dica = parsed.dica.trim();
    if (!leitura || !dica) return null;
    return { leitura, dica };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: noStore },
    );
  }
  const body = await request.json().catch(() => ({}));
  const mode = typeof body?.mode === "string" ? body.mode : "insight";
  const section = typeof body?.section === "string" ? body.section : "geral";
  const context = typeof body?.context === "string" ? body.context : "";
  const card = typeof body?.card === "string" ? body.card : "geral";

  if (mode === "leitura") {
    let leitura = "";
    let dica = "";
    try {
      const res = await aiChat(
        [
          {
            role: "system",
            content:
              "Você é um estrategista eleitoral sênior para campanha no Brasil. Responda SOMENTE com JSON válido no formato {\"leitura\":\"...\",\"dica\":\"...\"}. leitura = 1-2 frases curtas explicando o gráfico em linguagem de leigo. dica = 1 frase de ação concreta para o candidato. Sem saudações, sem markdown, sem citar modelo, provedor ou IA.",
          },
          {
            role: "user",
            content: `Card: ${card}. Dados atuais: ${context}. Gere leitura e dica de ação.`,
          },
        ],
        { temperature: 0.55, maxTokens: 200 },
      );
      if (res.ok && res.text.trim()) {
        const parsed = parseLeituraJson(res.text);
        if (parsed) {
          leitura = parsed.leitura;
          dica = parsed.dica;
        }
      }
    } catch {
      /* cai no fallback */
    }
    if (!leitura || !dica) {
      const fb = heuristicaLeitura(card, context);
      leitura = leitura || fb.leitura;
      dica = dica || fb.dica;
    }
    return NextResponse.json({ leitura, dica }, { headers: noStore });
  }

  let insight = "";
  try {
    const res = await aiChat(
      [
        {
          role: "system",
          content:
            "Você é um estrategista eleitoral sênior. Responda em português do Brasil, com 1 a 2 frases curtas, diretas e acionáveis. Sem saudações, sem rótulos, apenas o conselho. Nunca cite modelo ou provedor de IA.",
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

  return NextResponse.json({ insight }, { headers: noStore });
}
