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
  "equipe",
  "oportunidades",
  "pesquisas",
  "gastos",
  "voz",
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

const FonteDadoSchema = z.enum(["real", "modelado"]);

export const IdxSnapshotSchema = z.object({
  valor: z.number(),
  variacaoDia: z.number(), // % vs fechamento de ontem
  candles30d: z.array(CandleSchema),
  candleVivo: CandleSchema,
  breakdown: IdxBreakdownSchema,
  /** Origem de cada componente do índice (para tags na UI). */
  fontes: z
    .object({
      mencoes: FonteDadoSchema,
      sentimento: FonteDadoSchema,
      seguidores: FonteDadoSchema,
      imprensa: FonteDadoSchema,
    })
    .optional(),
});
export type IdxSnapshot = z.infer<typeof IdxSnapshotSchema>;

export const IdxDeltaSchema = z.object({
  valor: z.number(),
  variacaoDia: z.number(),
  candleVivo: CandleSchema,
  breakdown: IdxBreakdownSchema,
  fontes: IdxSnapshotSchema.shape.fontes,
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
  /** Intenção de voto REAL (%) da pesquisa mais recente, quando disponível. */
  pct: z.number().optional(),
});
export type QuoteNac = z.infer<typeof QuoteNacSchema>;

export const PesquisaPresSchema = z.object({
  instituto: z.string(),
  data: z.string(),
  lula: z.number().nullable(),
  flavio: z.number().nullable(),
  caiado: z.number().nullable(),
  zema: z.number().nullable(),
  renan: z.number().nullable(),
});
export type PesquisaPres = z.infer<typeof PesquisaPresSchema>;

export const QuotesNacSnapshotSchema = z.object({
  atores: z.array(QuoteNacSchema),
  /** Fonte da pesquisa presidencial real (instituto + data). */
  fonte: z.object({ instituto: z.string(), data: z.string() }).optional(),
  /** Tabela das últimas pesquisas presidenciais reais (página Cenário). */
  presidencial: z.array(PesquisaPresSchema).optional(),
});
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
  orgao: z.string().optional(),
  /** Traições à orientação do PL detectadas até agora. */
  traicoes: z.array(DeputadoVotoSchema),
});
export type Votacao = z.infer<typeof VotacaoSchema>;

export const VotacaoHistoricoItemSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  data: z.string(),
  orgao: z.string(),
  sim: z.number(),
  nao: z.number(),
  outros: z.number(),
  aprovacao: z.boolean(),
  votoSostenes: z.string().nullable().optional(),
  temNominal: z.boolean().optional(),
});
export type VotacaoHistoricoItem = z.infer<typeof VotacaoHistoricoItemSchema>;

export const VotoDeputadoItemSchema = z.object({
  idVotacao: z.string(),
  data: z.string(),
  voto: z.string(),
  titulo: z.string(),
  orgao: z.string(),
});
export type VotoDeputadoItem = z.infer<typeof VotoDeputadoItemSchema>;

export const PlenarioStateSchema = z.object({
  votacaoAtiva: z.boolean(),
  votacao: VotacaoSchema.nullable(),
  /** Última votação encerrada com placar (quando não há sessão ao vivo). */
  votacaoRecente: VotacaoSchema.nullable().optional(),
  historico: z.array(VotacaoHistoricoItemSchema).optional(),
  votosDeputado: z.array(VotoDeputadoItemSchema).optional(),
  orgaosMonitorados: z.array(z.object({ sigla: z.string(), nome: z.string() })).optional(),
  fidelidade: z.object({ com: z.number(), total: z.number(), pct: z.number() }),
  caboDeGuerra: z.object({
    temaOposicao: z.string(),
    temaGoverno: z.string(),
    /** Share of voice da oposição, 0..100 (governo = 100 - x). */
    shareOposicao: z.number(),
  }),
  /** Quem está falando pela oposição (últimas 6h). */
  vozes: z.array(z.object({ nome: z.string(), partido: z.string(), mencoes: z.number() })),
  fonte: FonteDadoSchema.optional(),
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
  rede: z.enum(["instagram", "x", "youtube", "facebook", "tiktok", "linkedin"]),
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

/* ══ v2 ══ */

/* ── redes (AMPLIADO): histórico por rede + concorrentes + veículos ── */

export const RedeIdSchema = z.enum(["x", "instagram", "facebook", "youtube", "tiktok", "linkedin"]);
export type RedeId = z.infer<typeof RedeIdSchema>;

export const ConcorrenteRedeSchema = z.object({
  simbolo: z.string(),
  nome: z.string(),
  cor: z.string(),
  foto: z.string().nullable(),
  seguidores: z.number(),
  engajamento: z.number(),
  crescimento7d: z.number(),
});
export type ConcorrenteRede = z.infer<typeof ConcorrenteRedeSchema>;

export const RedeHistSchema = z.object({
  rede: RedeIdSchema,
  /** Históricos 30d só viajam no snapshot (deltas são parciais). */
  seguidores30d: z.array(PointSchema),
  engajamento30d: z.array(PointSchema),
  seguidoresAgora: z.number(),
  engajamentoAgora: z.number(),
  concorrentes: z.array(ConcorrenteRedeSchema),
  melhorHorario: z.object({ dia: z.string(), hora: z.number() }),
  /** Origem dos números desta rede ("real" = fonte aberta, ex.: YouTube via yt-dlp). */
  fonte: FonteDadoSchema.optional(),
});
export type RedeHist = z.infer<typeof RedeHistSchema>;

export const VeiculoSovSchema = z.object({
  veiculo: z.string(),
  share: z.number(), // 0..100
  tom: z.number(), // -1..+1
  alcance: z.number(),
  spark: z.array(z.number()),
});
export type VeiculoSov = z.infer<typeof VeiculoSovSchema>;

export const YoutubeVideoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  views: z.number(),
  comentarios: z.number(),
  likes: z.number(),
  data: z.string(),
  engajamento: z.number(),
});
export type YoutubeVideo = z.infer<typeof YoutubeVideoSchema>;

export const RedesV2SnapshotSchema = RedesStateSchema.extend({
  porRede: z.array(RedeHistSchema),
  veiculos: z.array(VeiculoSovSchema),
  /** [diaIdx, horaIdx, valor 0..100] — melhor horário de postagem. */
  heatmapPostagem: z.array(z.tuple([z.number(), z.number(), z.number()])),
  /** Vídeos reais do YouTube (yt-dlp). Ausente = modelado. */
  youtubeVideos: z.array(YoutubeVideoSchema).optional(),
});
export type RedesV2Snapshot = z.infer<typeof RedesV2SnapshotSchema>;

export const RedesV2DeltaSchema = RedesStateSchema.extend({
  porRedeVivo: z.array(
    z.object({
      rede: RedeIdSchema,
      seguidoresAgora: z.number(),
      engajamentoAgora: z.number(),
      concorrentes: z.array(ConcorrenteRedeSchema),
    }),
  ),
  veiculos: z.array(VeiculoSovSchema),
});
export type RedesV2Delta = z.infer<typeof RedesV2DeltaSchema>;

/* ── equipe — correligionários em camadas + cadastros em tempo real ── */

export const EquipeTierSchema = z.object({
  nivel: z.string(),
  nome: z.string(),
  plural: z.string(),
  cor: z.string(),
  avatar: z.string(),
  count: z.number(),
  cadastroPct: z.number(),
  engajadoPct: z.number(),
  topPerformer: z.object({ nome: z.string(), pct: z.number() }),
});
export type EquipeTier = z.infer<typeof EquipeTierSchema>;

export const EquipeFeedItemSchema = z.object({
  id: z.string(),
  t: z.number(),
  nome: z.string(),
  acao: z.string(),
  nivel: z.string(),
  cor: z.string(),
});
export type EquipeFeedItem = z.infer<typeof EquipeFeedItemSchema>;

export const EquipeGeralSchema = z.object({
  lista: z.number(),
  cadastrados: z.number(),
  engajados: z.number(),
  meta: z.number(),
  velocidadeMin: z.number(),
});

export const EquipeSnapshotSchema = z.object({
  geral: EquipeGeralSchema,
  porRegiao: z.array(
    z.object({
      id: z.string(),
      nome: z.string(),
      cadastrados: z.number(),
      meta: z.number(),
      pct: z.number(),
      spark: z.array(z.number()),
    }),
  ),
  tiers: z.array(EquipeTierSchema),
  funil: z.object({ lista: z.number(), cadastro: z.number(), engajado: z.number() }),
  ranking: z.array(
    z.object({
      nome: z.string(),
      nivel: z.string(),
      regiao: z.string(),
      atingimentoPct: z.number(),
      cadastrados: z.number(),
    }),
  ),
  // Piores líderes/cabos (menor atingimento) — para o candidato cobrar/ajudar.
  lanternas: z
    .array(
      z.object({
        nome: z.string(),
        nivel: z.string(),
        regiao: z.string(),
        atingimentoPct: z.number(),
        cadastrados: z.number(),
      }),
    )
    .optional(),
  feed: z.array(EquipeFeedItemSchema),
});
export type EquipeSnapshot = z.infer<typeof EquipeSnapshotSchema>;

export const EquipeDeltaSchema = z.object({
  geral: EquipeGeralSchema,
  porRegiao: z.array(
    z.object({ id: z.string(), cadastrados: z.number(), pct: z.number(), sparkLast: z.number() }),
  ),
  funil: z.object({ lista: z.number(), cadastro: z.number(), engajado: z.number() }),
  feedNovos: z.array(EquipeFeedItemSchema),
});
export type EquipeDelta = z.infer<typeof EquipeDeltaSchema>;

/* ── oportunidades — forças × fraquezas por região, com notícias ── */

export const OportunidadeRegiaoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  forca: z.object({ tema: z.string(), score: z.number() }),
  fraquezas: z.array(
    z.object({
      adversario: z.object({
        simbolo: z.string(),
        nome: z.string(),
        cor: z.string(),
        foto: z.string().nullable(),
      }),
      tema: z.string(),
      evidencia: z.string(),
      severidade: z.number(), // 0..100
    }),
  ),
  matriz: z.array(
    z.object({
      tema: z.string(),
      demanda: z.number(),
      satisfacao: z.number(),
      potencialVotos: z.number(),
      urgencia: z.number(),
      oportunidade: z.number(),
    }),
  ),
  noticias: z.array(
    z.object({ titulo: z.string(), veiculo: z.string(), tema: z.string(), link: z.string() }),
  ),
  discurso: z.object({ tema: z.string(), texto: z.string() }),
});
export type OportunidadeRegiao = z.infer<typeof OportunidadeRegiaoSchema>;

export const OportunidadesStateSchema = z.object({
  regioes: z.array(OportunidadeRegiaoSchema),
  topGeral: z.array(z.object({ regiao: z.string(), tema: z.string(), indice: z.number() })),
  municao: z.array(
    z.object({ titulo: z.string(), veiculo: z.string(), alcance: z.number(), tema: z.string() }),
  ),
});
export type OportunidadesState = z.infer<typeof OportunidadesStateSchema>;

/* ── pesquisas — oficiais + pesquisa própria ao vivo ── */

export const PesqCandidatoSchema = z.object({
  nome: z.string(),
  partido: z.string(),
  cor: z.string(),
  foto: z.string().nullable(),
  intencao: z.number(),
  rejeicao: z.number(),
});
export type PesqCandidato = z.infer<typeof PesqCandidatoSchema>;

export const SeriesLiteSchema = z.object({
  labels: z.array(z.string()),
  series: z.array(z.object({ nome: z.string(), cor: z.string(), data: z.array(z.number()) })),
});
export type SeriesLite = z.infer<typeof SeriesLiteSchema>;

export const PesquisaPropriaSchema = z.object({
  pergunta: z.string(),
  opcoes: z.array(z.object({ label: z.string(), cor: z.string() })),
  live: z.object({
    disparados: z.number(),
    entregues: z.number(),
    abertos: z.number(),
    respondidos: z.number(),
    taxaResposta: z.number(),
    velocidade: z.number(),
    porOpcao: z.array(
      z.object({ label: z.string(), cor: z.string(), pct: z.number(), votos: z.number() }),
    ),
    porRegiao: z.array(z.object({ nome: z.string(), value: z.number() })),
    serieTempo: z.array(z.number()),
    sentimento: z.object({ pos: z.number(), neu: z.number(), neg: z.number() }),
  }),
});

export const PesquisasSnapshotSchema = z.object({
  oficiais: z.object({
    ranking: z.array(PesqCandidatoSchema),
    timeline: SeriesLiteSchema,
    institutos: SeriesLiteSchema,
    recortes: z.array(SeriesLiteSchema.extend({ recorte: z.string() })),
  }),
  propria: PesquisaPropriaSchema,
  calendario: z.array(
    z.object({ semana: z.string(), tema: z.string(), objetivo: z.string() }),
  ),
});
export type PesquisasSnapshot = z.infer<typeof PesquisasSnapshotSchema>;

export const PesquisasDeltaSchema = z.object({ propria: PesquisaPropriaSchema });
export type PesquisasDelta = z.infer<typeof PesquisasDeltaSchema>;

/* ── gastos — execução financeira da campanha ── */

export const GastosStateSchema = z.object({
  fonteDados: z.enum(["real", "modelado"]).optional(),
  saldo: z.object({
    total: z.number(),
    gasto: z.number(),
    disponivel: z.number(),
    pctExecutado: z.number(),
  }),
  execucao: z.object({
    labels: z.array(z.string()),
    planejado: z.array(z.number()),
    realizado: z.array(z.number()),
    projecao: z.array(z.number()),
  }),
  fontes: z.array(
    z.object({ nome: z.string(), valor: z.number(), pct: z.number(), cor: z.string() }),
  ),
  rubricas: z.array(
    z.object({
      nome: z.string(),
      orcado: z.number(),
      gasto: z.number(),
      pct: z.number(),
      status: z.enum(["ok", "atencao", "estouro"]),
    }),
  ),
  burnRate: z.object({
    semanaAtual: z.number(),
    mediaSemanal: z.number(),
    tendencia: z.enum(["acelerando", "estavel", "desacelerando"]),
  }),
  custoPorVoto: z.object({
    atual: z.number(),
    projetado: z.number(),
    benchmark: z.number(),
  }),
  alertas: z.array(
    z.object({ rubrica: z.string(), msg: z.string(), nivel: z.enum(["amarelo", "vermelho"]) }),
  ),
});
export type GastosState = z.infer<typeof GastosStateSchema>;

/* ── voz — chat do eleitorado (WhatsApp + comentários de redes) ── */

export const VozFonteSchema = z.enum(["eleitor", "x", "instagram", "facebook", "youtube"]);
export type VozFonte = z.infer<typeof VozFonteSchema>;

export const VozMsgSchema = z.object({
  id: z.string(),
  t: z.number(),
  fonte: VozFonteSchema,
  nome: z.string(),
  bairro: z.string().optional(),
  regiao: z.string().optional(),
  texto: z.string(),
  sentimento: TomSchema,
  curtidas: z.number().optional(),
});
export type VozMsg = z.infer<typeof VozMsgSchema>;

export const VozContadoresSchema = z.object({
  totalHoje: z.number(),
  porMinuto: z.number(),
  sentimento: z.object({ pos: z.number(), neg: z.number(), neu: z.number() }),
  porFonte: z.record(z.string(), z.number()),
});

export const VozSnapshotSchema = z.object({
  mensagens: z.array(VozMsgSchema),
  contadores: VozContadoresSchema,
});
export type VozSnapshot = z.infer<typeof VozSnapshotSchema>;

export const VozDeltaSchema = z.object({
  mensagens: z.array(VozMsgSchema),
  contadores: VozContadoresSchema,
});
export type VozDelta = z.infer<typeof VozDeltaSchema>;

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
  redes: { snapshot: RedesV2SnapshotSchema, delta: RedesV2DeltaSchema },
  c2026: { snapshot: C2026StateSchema, delta: C2026StateSchema },
  equipe: { snapshot: EquipeSnapshotSchema, delta: EquipeDeltaSchema },
  oportunidades: { snapshot: OportunidadesStateSchema, delta: OportunidadesStateSchema },
  pesquisas: { snapshot: PesquisasSnapshotSchema, delta: PesquisasDeltaSchema },
  gastos: { snapshot: GastosStateSchema, delta: GastosStateSchema },
  voz: { snapshot: VozSnapshotSchema, delta: VozDeltaSchema },
};
