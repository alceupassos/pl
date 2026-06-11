// Contratos do stream vivo do /m (SSE multiplexado).
// Compartilhado server (gerador mock) ↔ client (LiveStore): quando os
// coletores reais substituírem o mock, o front não muda — só quem emite.

import { z } from "zod";

/* ── primitivas ── */

export const PointSchema = z.object({ t: z.number(), v: z.number() });
export type Point = z.infer<typeof PointSchema>;

export const CandleSchema = z.object({
  t: z.number(), // início do período (epoch ms)
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
});
export type Candle = z.infer<typeof CandleSchema>;

export const TomSchema = z.enum(["pos", "neg", "neu"]);
export type Tom = z.infer<typeof TomSchema>;

/* ── canais ── */

export const CHANNELS = [
  "watchlist",
  "idx.sost",
  "sent.ecg",
  "ticker.tape",
  "quotes.rj",
  "quotes.nac",
  "alerts",
  "plenario",
  "rio.pulsos",
  "radar",
  "redes",
  "c2026",
] as const;

export const ChannelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof ChannelSchema>;

export const EnvelopeSchema = z.object({
  ch: ChannelSchema,
  kind: z.enum(["snapshot", "delta"]),
  seq: z.number(),
  t: z.number(), // epoch ms do servidor
  data: z.unknown(),
});
export type Envelope = z.infer<typeof EnvelopeSchema>;

/* ── idx.sost — índice composto do candidato ── */

export const IdxBreakdownSchema = z.object({
  mencoes: z.number(),
  sentimento: z.number(),
  seguidores: z.number(),
  imprensa: z.number(),
});

export const IdxSnapshotSchema = z.object({
  valor: z.number(),
  variacaoDia: z.number(), // % vs fechamento de ontem
  candles30d: z.array(CandleSchema),
  candleVivo: CandleSchema,
  breakdown: IdxBreakdownSchema,
});
export type IdxSnapshot = z.infer<typeof IdxSnapshotSchema>;

export const IdxDeltaSchema = z.object({
  valor: z.number(),
  variacaoDia: z.number(),
  candleVivo: CandleSchema,
  breakdown: IdxBreakdownSchema,
});
export type IdxDelta = z.infer<typeof IdxDeltaSchema>;

/* ── sent.ecg — eletrocardiograma de sentimento ── */

export const EcgWindowSchema = z.object({
  pos: z.array(PointSchema),
  neg: z.array(PointSchema),
});

export const EcgSnapshotSchema = z.object({
  h1: EcgWindowSchema,
  h24: EcgWindowSchema,
  d7: EcgWindowSchema,
  mencoesMin: z.number(),
});
export type EcgSnapshot = z.infer<typeof EcgSnapshotSchema>;

export const EcgDeltaSchema = z.object({
  pos: PointSchema,
  neg: PointSchema,
  mencoesMin: z.number(),
});
export type EcgDelta = z.infer<typeof EcgDeltaSchema>;

/* ── ticker.tape — manchetes ── */

export const MancheteSchema = z.object({
  id: z.string(),
  texto: z.string(),
  tom: TomSchema,
});
export type Manchete = z.infer<typeof MancheteSchema>;

export const TapeSnapshotSchema = z.object({
  nacional: z.array(MancheteSchema),
  rj: z.array(MancheteSchema),
});
export type TapeSnapshot = z.infer<typeof TapeSnapshotSchema>;

export const TapeDeltaSchema = z.object({
  trilha: z.enum(["nacional", "rj"]),
  manchete: MancheteSchema,
});
export type TapeDelta = z.infer<typeof TapeDeltaSchema>;

/* ── quotes.rj — fita dos concorrentes ── */

export const QuoteRjSchema = z.object({
  simbolo: z.string(),
  valor: z.number(),
  variacao24h: z.number(), // %
  candles30d: z.array(CandleSchema),
  candleVivo: CandleSchema,
  /** Sparkline de seguidores (últimos 14 pontos). */
  sparkSeguidores: z.array(z.number()),
});
export type QuoteRj = z.infer<typeof QuoteRjSchema>;

export const QuotesRjSnapshotSchema = z.object({ quotes: z.array(QuoteRjSchema) });
export type QuotesRjSnapshot = z.infer<typeof QuotesRjSnapshotSchema>;

export const QuotesRjDeltaSchema = z.object({
  quotes: z.array(
    z.object({
      simbolo: z.string(),
      valor: z.number(),
      variacao24h: z.number(),
      candleVivo: CandleSchema,
      sparkLast: z.number(),
    }),
  ),
});
export type QuotesRjDelta = z.infer<typeof QuotesRjDeltaSchema>;

/* ── quotes.nac — atores nacionais ── */

export const QuoteNacSchema = z.object({
  id: z.string(),
  score: z.number(), // -100..+100
  dir: z.enum(["up", "down", "flat"]),
  spark: z.array(z.number()),
});
export type QuoteNac = z.infer<typeof QuoteNacSchema>;

export const QuotesNacSnapshotSchema = z.object({ atores: z.array(QuoteNacSchema) });
export type QuotesNacSnapshot = z.infer<typeof QuotesNacSnapshotSchema>;

export const QuotesNacDeltaSchema = z.object({
  atores: z.array(
    z.object({
      id: z.string(),
      score: z.number(),
      dir: z.enum(["up", "down", "flat"]),
      sparkLast: z.number(),
    }),
  ),
});
export type QuotesNacDelta = z.infer<typeof QuotesNacDeltaSchema>;

/* ── alerts — feed + push ── */

export const AlertSchema = z.object({
  id: z.string(),
  t: z.number(),
  nivel: z.enum(["info", "amarelo", "vermelho"]),
  tipo: z.enum(["spike", "votacao_iniciada", "traicao", "falaram_de_mim", "crise_rede"]),
  titulo: z.string(),
  corpo: z.string(),
  /** Aba de destino do deep link (ticker|plenario|rio|radar|redes|c2026). */
  tab: z.string().optional(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const AlertsSnapshotSchema = z.object({ alertas: z.array(AlertSchema) });
export type AlertsSnapshot = z.infer<typeof AlertsSnapshotSchema>;

export const AlertsDeltaSchema = z.object({ alerta: AlertSchema });
export type AlertsDelta = z.infer<typeof AlertsDeltaSchema>;

/* ── plenario — votações ao vivo (formato espelha Dados Abertos da Câmara) ── */

export const DeputadoVotoSchema = z.object({
  deputado_: z.object({
    nome: z.string(),
    siglaPartido: z.string(),
    siglaUf: z.string(),
    urlFoto: z.string().optional(),
  }),
  tipoVoto: z.enum(["Sim", "Não", "Abstenção", "Obstrução", "Ausente"]),
});
export type DeputadoVoto = z.infer<typeof DeputadoVotoSchema>;

export const VotacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  orientacaoPL: z.enum(["Sim", "Não"]),
  sim: z.number(),
  nao: z.number(),
  outros: z.number(),
  emAndamento: z.boolean(),
  /** Traições à orientação do PL detectadas até agora. */
  traicoes: z.array(DeputadoVotoSchema),
});
export type Votacao = z.infer<typeof VotacaoSchema>;

export const PlenarioStateSchema = z.object({
  votacaoAtiva: z.boolean(),
  votacao: VotacaoSchema.nullable(),
  fidelidade: z.object({ com: z.number(), total: z.number(), pct: z.number() }),
  caboDeGuerra: z.object({
    temaOposicao: z.string(),
    temaGoverno: z.string(),
    /** Share of voice da oposição, 0..100 (governo = 100 - x). */
    shareOposicao: z.number(),
  }),
  /** Quem está falando pela oposição (últimas 6h). */
  vozes: z.array(z.object({ nome: z.string(), partido: z.string(), mencoes: z.number() })),
});
export type PlenarioState = z.infer<typeof PlenarioStateSchema>;

/* ── rio.pulsos — mapa vivo do RJ ── */

export const RioPulsosSchema = z.object({
  pulsos: z.array(
    z.object({ municipio: z.string(), regiao: z.string(), intensidade: z.number() }),
  ),
  regioes: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      mencoes: z.number(),
      spark: z.array(z.number()),
    }),
  ),
  /** Racing de menções dos concorrentes no RJ. */
  racing: z.array(
    z.object({ simbolo: z.string(), mencoes: z.number(), crescimento: z.number() }),
  ),
  /** Equalizador do ecossistema evangélico (atividade 0..100 por entidade). */
  evangelico: z.array(z.object({ id: z.string(), atividade: z.number() })),
});
export type RioPulsos = z.infer<typeof RioPulsosSchema>;

/* ── radar — imprensa e munição ── */

export const RadarItemSchema = z.object({
  id: z.string(),
  t: z.number(),
  titulo: z.string(),
  veiculo: z.string(),
  tom: TomSchema,
  link: z.string().optional(),
  trecho: z.string().optional(),
  /** Alcance estimado em milhares. */
  alcance: z.number(),
});
export type RadarItem = z.infer<typeof RadarItemSchema>;

export const RadarStateSchema = z.object({
  falaramDeMim: z.array(RadarItemSchema),
  pauta: z.array(RadarItemSchema),
  municao: z.array(RadarItemSchema),
  colunistas: z.array(
    z.object({
      nome: z.string(),
      veiculo: z.string(),
      tom: z.number(), // -1..+1
      alcance: z.number(),
    }),
  ),
});
export type RadarState = z.infer<typeof RadarStateSchema>;

/* ── redes — engajamento próprio ── */

export const PlataformaSchema = z.object({
  rede: z.enum(["instagram", "x", "youtube", "facebook", "tiktok"]),
  seguidores: z.number(),
  deltaDia: z.number(),
  engajamento: z.number(), // %
});

export const RedesStateSchema = z.object({
  plataformas: z.array(PlataformaSchema),
  ultimoPost: z.object({
    rede: z.string(),
    texto: z.string(),
    t: z.number(),
    curtidas: z.number(),
    comentarios: z.number(),
    compartilhamentos: z.number(),
    views: z.number(),
    /** Curva de engajamento da 1ª hora (pontos por minuto). */
    curva1h: z.array(PointSchema),
    /** Banda média dos últimos 30 posts (p25/p75 por minuto). */
    bandaP25: z.array(z.number()),
    bandaP75: z.array(z.number()),
    selo: z.enum(["fogo", "sono", "normal"]),
  }),
  racingSemanal: z.array(
    z.object({ nome: z.string(), cor: z.string(), engajamento7d: z.number() }),
  ),
  crise: z.object({
    ativo: z.boolean(),
    zscore: z.number(),
    polaridade: TomSchema,
  }),
});
export type RedesState = z.infer<typeof RedesStateSchema>;

/* ── c2026 — a régua ── */

export const C2026StateSchema = z.object({
  pollOfPolls: z.object({
    labels: z.array(z.string()),
    series: z.array(
      z.object({
        nome: z.string(),
        cor: z.string(),
        media: z.array(z.number()),
        lo: z.array(z.number()),
        hi: z.array(z.number()),
      }),
    ),
  }),
  bancada: z.object({
    quociente: z.number(),
    votosLegendaPL: z.number(),
    base: z.number(),
    faixa: z.tuple([z.number(), z.number()]),
    posicaoLista: z.number(),
  }),
  pesqEle: z.object({ proximaJanela: z.string(), diasRestantes: z.number() }),
  polymarket: z.array(z.object({ mercado: z.string(), prob: z.number() })),
  aprovacao: z.object({
    aprova: z.number(),
    desaprova: z.number(),
    segmentos: z.array(
      z.object({ seg: z.string(), aprova: z.number(), desaprova: z.number() }),
    ),
  }),
});
export type C2026State = z.infer<typeof C2026StateSchema>;

/* ── mapa canal → schema (validação no client) ── */

export const CHANNEL_SCHEMAS: Record<Channel, { snapshot: z.ZodTypeAny; delta: z.ZodTypeAny }> = {
  watchlist: { snapshot: z.unknown(), delta: z.unknown() }, // validada por WatchlistSchema no consumo
  "idx.sost": { snapshot: IdxSnapshotSchema, delta: IdxDeltaSchema },
  "sent.ecg": { snapshot: EcgSnapshotSchema, delta: EcgDeltaSchema },
  "ticker.tape": { snapshot: TapeSnapshotSchema, delta: TapeDeltaSchema },
  "quotes.rj": { snapshot: QuotesRjSnapshotSchema, delta: QuotesRjDeltaSchema },
  "quotes.nac": { snapshot: QuotesNacSnapshotSchema, delta: QuotesNacDeltaSchema },
  alerts: { snapshot: AlertsSnapshotSchema, delta: AlertsDeltaSchema },
  plenario: { snapshot: PlenarioStateSchema, delta: PlenarioStateSchema },
  "rio.pulsos": { snapshot: RioPulsosSchema, delta: RioPulsosSchema },
  radar: { snapshot: RadarStateSchema, delta: RadarStateSchema },
  redes: { snapshot: RedesStateSchema, delta: RedesStateSchema },
  c2026: { snapshot: C2026StateSchema, delta: C2026StateSchema },
};
