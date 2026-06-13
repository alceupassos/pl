// Mock vivo do /m — TUDO é função pura do tempo: f(seed, t) → valor.
// Qualquer conexão SSE, a qualquer momento, reconstrói exatamente o mesmo
// "mundo" (sazonalidade + ruído multi-seno + spikes agendados por hash),
// então snapshot-then-delta na reconexão é barato e sempre coerente.
// Server-only (lê a watchlist do disco via lib/watchlist).

import { getRaceTimeline } from "@/lib/mock/races";
// Builders v2 (equipe/oportunidades/pesquisas/gastos/voz + redes ampliado).
// Import dinâmico-circular seguro: só usamos as funções em tempo de chamada.
import * as v2 from "@/lib/live-mock-v2";
import { REGIONS } from "@/lib/mock/rj-regions";
import { calcularQuociente, projetarBancada } from "@/lib/quociente";
// Fontes REAIS: Google News (imprensa + manchetes) é a primária; GDELT é
// fallback secundário (endpoint grátis é throttled). sentimento ainda vem do
// GDELT até o sidecar pysentimiento. Exceções ao "tudo é função pura do tempo"
// — todas com fallback para o sintético.
import { getImprensaIndex as getGdeltImprensa, getSentimentoIndex } from "@/lib/sources/gdelt";
import { getNewsImprensa, newsAlertasRecentes } from "@/lib/sources/google-news";
import { getPlenarioReal, fidelidadePLDeNominais } from "@/lib/sources/plenario";
import { getSentimentoReal } from "@/lib/sources/sentiment";
import { getTrendsReal, hasTrendsReal } from "@/lib/sources/trends";
import { idxOpenToday, mergeIdxCandles, recordIdxClose } from "@/lib/sources/idx-history";
import { getSeguidoresReal } from "@/lib/sources/youtube";
import { getFontePesquisa, getPesquisas, getPresidencial, type CandKey } from "@/lib/sources/pesquisas";
import type { Watchlist } from "@/lib/watchlist";
import type {
  Alert,
  C2026State,
  Candle,
  Channel,
  EcgDelta,
  EcgSnapshot,
  Envelope,
  IdxDelta,
  IdxSnapshot,
  Manchete,
  PlenarioState,
  Point,
  QuoteNac,
  QuotesNacDelta,
  QuotesNacSnapshot,
  QuoteRj,
  QuotesRjDelta,
  QuotesRjSnapshot,
  RadarState,
  RedesState,
  RioPulsos,
  TapeDelta,
  TapeSnapshot,
} from "@/lib/live-schemas";

/* ══ núcleo determinístico ══ */

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;
/** Referência fixa para tendências (evita números explodirem com o tempo). */
const REF = Date.UTC(2026, 0, 1);

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Ruído suave -1..1: soma de senos dessincronizados em períodos distintos. */
export function noise(seed: string, t: number, octaves = 3): number {
  const base = hash(seed);
  // períodos: ~37min, ~3.1h, ~17h — primos para nunca "baterem juntos"
  const periods = [37 * MIN, 187 * MIN, 1021 * MIN, 4421 * MIN];
  let sum = 0;
  let amp = 0;
  for (let i = 0; i < octaves; i += 1) {
    const phase = ((base >> (i * 5)) % 628) / 100;
    const weight = 1 / (i + 1);
    sum += Math.sin(phase + (t / periods[i % periods.length]) * Math.PI * 2) * weight;
    amp += weight;
  }
  return sum / amp;
}

/** Perfil de atividade diário/semanal: madrugada fria, picos 12h e 20h. */
export function seasonal(t: number): number {
  const d = new Date(t);
  const hour = d.getHours() + d.getMinutes() / 60;
  const lunch = Math.exp(-((hour - 12.5) ** 2) / 6);
  const prime = Math.exp(-((hour - 20.5) ** 2) / 5);
  const night = hour < 6 ? -0.55 : 0;
  const weekend = d.getDay() === 0 || d.getDay() === 6 ? -0.12 : 0;
  return lunch * 0.45 + prime * 0.6 + night + weekend;
}

/**
 * Spike agendado por hash: para cada dia, decide se há spike, em que minuto
 * começa e com que força; intensidade decai exponencialmente (~70min).
 * Retorna 0..1. Determinístico: o gerador "sabe" quando o spike começa,
 * então consegue emitir o Alert exatamente no tick certo.
 */
export function spikeAt(seed: string, t: number): number {
  let total = 0;
  // olha o dia atual e o anterior (spike pode atravessar a meia-noite)
  for (let back = 0; back < 2; back += 1) {
    const dayIndex = Math.floor(t / DAY) - back;
    const h = hash(`${seed}:spike:${dayIndex}`);
    if (h % 100 >= 38) continue; // ~38% dos dias têm spike nesta série
    const startMin = 7 * 60 + (h % (15 * 60)); // entre 07:00 e 22:00
    const start = dayIndex * DAY + startMin * MIN;
    const elapsed = t - start;
    if (elapsed < 0) continue;
    const force = 0.45 + ((h >> 8) % 56) / 100; // 0.45..1.0
    total += force * Math.exp(-elapsed / (70 * MIN));
  }
  return Math.min(1, total);
}

/** Início (epoch ms) do spike do dia para a série, ou null se não houver. */
export function spikeStart(seed: string, dayIndex: number): number | null {
  const h = hash(`${seed}:spike:${dayIndex}`);
  if (h % 100 >= 38) return null;
  return dayIndex * DAY + (7 * 60 + (h % (15 * 60))) * MIN;
}

export type SeriesParams = {
  base: number;
  /** Volatilidade relativa (0.03 = ±3%). */
  vol: number;
  /** Tendência por dia (0.002 = +0.2%/dia). */
  trend?: number;
  /** Quanto o spike empurra a série (default 0.5 = +50% no pico). */
  spikeBoost?: number;
  /** Quanto a sazonalidade pesa (default 0.18). */
  seasonalWeight?: number;
};

export function seriesValue(seed: string, t: number, p: SeriesParams): number {
  const days = (t - REF) / DAY;
  const trended = p.base * (1 + (p.trend ?? 0) * days);
  const n = 1 + p.vol * noise(seed, t);
  const s = 1 + (p.seasonalWeight ?? 0.18) * seasonal(t);
  const sp = 1 + (p.spikeBoost ?? 0.5) * spikeAt(seed, t);
  return trended * n * s * sp;
}

/* ══ OHLC coerente ══ */

function dayEnd(dayIndex: number): number {
  return (dayIndex + 1) * DAY - 1;
}

function closeOf(seed: string, dayIndex: number, p: SeriesParams): number {
  return seriesValue(seed, dayEnd(dayIndex), p);
}

/** Candles diários dos últimos `days` dias FECHADOS (exclui o dia corrente). */
export function dailyCandles(seed: string, days: number, now: number, p: SeriesParams): Candle[] {
  const today = Math.floor(now / DAY);
  const out: Candle[] = [];
  for (let d = today - days; d < today; d += 1) {
    const close = closeOf(seed, d, p);
    const prevClose = closeOf(seed, d - 1, p);
    const gap = 1 + 0.25 * p.vol * noise(`${seed}:gap`, d * DAY);
    const open = prevClose * gap;
    const wick = Math.abs(noise(`${seed}:wick`, d * DAY)) * p.vol * close;
    out.push({
      t: d * DAY,
      o: round2(open),
      c: round2(close),
      h: round2(Math.max(open, close) + wick),
      l: round2(Math.min(open, close) - wick * 0.8),
    });
  }
  return out;
}

/** Candle vivo do dia corrente — high/low amostrados a cada 30min (determinístico). */
export function liveCandle(seed: string, now: number, p: SeriesParams): Candle {
  const today = Math.floor(now / DAY);
  const prevClose = closeOf(seed, today - 1, p);
  const open = prevClose * (1 + 0.25 * p.vol * noise(`${seed}:gap`, today * DAY));
  const close = seriesValue(seed, now, p);
  let h = Math.max(open, close);
  let l = Math.min(open, close);
  for (let t = today * DAY; t <= now; t += 30 * MIN) {
    const v = seriesValue(seed, t, p);
    if (v > h) h = v;
    if (v < l) l = v;
  }
  return { t: today * DAY, o: round2(open), c: round2(close), h: round2(h), l: round2(l) };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function pctChange(now: number, ref: number): number {
  if (ref === 0) return 0;
  return round2(((now - ref) / ref) * 100);
}

function pointsWindow(seed: string, now: number, span: number, step: number, p: SeriesParams): Point[] {
  const out: Point[] = [];
  const start = Math.ceil((now - span) / step) * step;
  for (let t = start; t <= now; t += step) {
    out.push({ t, v: round1(seriesValue(seed, t, p)) });
  }
  return out;
}

/* ══ parâmetros por série ══ */

const IDX_PARTS: { key: "mencoes" | "sentimento" | "seguidores" | "imprensa"; p: SeriesParams }[] = [
  { key: "mencoes", p: { base: 100, vol: 0.10, trend: 0.0016, spikeBoost: 0.8 } },
  { key: "sentimento", p: { base: 100, vol: 0.05, trend: 0.0008, spikeBoost: 0.25 } },
  { key: "seguidores", p: { base: 100, vol: 0.015, trend: 0.0022, spikeBoost: 0.1, seasonalWeight: 0.04 } },
  { key: "imprensa", p: { base: 100, vol: 0.13, trend: 0.0011, spikeBoost: 0.9 } },
];

// Componentes do índice. imprensa vem do GDELT (real) quando há sinal; senão
// cai na série sintética. menções/sentimento/seguidores seguem modelados até
// termos APIs sociais com credencial — então o índice já é PARCIALMENTE real.
type IdxComponents = { mencoes: number; sentimento: number; seguidores: number; imprensa: number };
function idxComponents(t: number): IdxComponents {
  return {
    mencoes: getTrendsReal() ?? seriesValue("sost:mencoes", t, IDX_PARTS[0].p),
    // sentimento: sidecar pysentimiento (real) → GDELT tone → série sintética.
    sentimento:
      getSentimentoReal() ?? getSentimentoIndex() ?? seriesValue("sost:sentimento", t, IDX_PARTS[1].p),
    // seguidores: inscritos do YouTube (real, via yt-dlp) → série sintética.
    seguidores: getSeguidoresReal() ?? seriesValue("sost:seguidores", t, IDX_PARTS[2].p),
    // imprensa: Google News (primária) → GDELT (fallback) → série sintética.
    imprensa: getNewsImprensa() ?? getGdeltImprensa() ?? seriesValue("sost:imprensa", t, IDX_PARTS[3].p),
  };
}

function idxFontes(): NonNullable<IdxSnapshot["fontes"]> {
  return {
    mencoes: hasTrendsReal() ? "real" : "modelado",
    sentimento: getSentimentoReal() !== null ? "real" : "modelado",
    seguidores: getSeguidoresReal() !== null ? "real" : "modelado",
    imprensa: getNewsImprensa() !== null ? "real" : "modelado",
  };
}

function idxValueAt(t: number, w: Watchlist): number {
  const pesos = w.pesosIndice;
  const totalPeso = pesos.mencoes + pesos.sentimento + pesos.seguidores + pesos.imprensa || 1;
  const c = idxComponents(t);
  const v =
    c.mencoes * (pesos.mencoes / totalPeso) +
    c.sentimento * (pesos.sentimento / totalPeso) +
    c.seguidores * (pesos.seguidores / totalPeso) +
    c.imprensa * (pesos.imprensa / totalPeso);
  return v * 1.42; // escala de "índice" (~142 pontos)
}

const IDX_AS_SERIES: SeriesParams = { base: 142, vol: 0.05, trend: 0.0015, spikeBoost: 0.4 };

function concorrenteParams(simbolo: string, votos2022: number | null): SeriesParams {
  const h = hash(`conc:${simbolo}`);
  return {
    base: votos2022 ? votos2022 / 2000 : 92, // ~95..107 pontos
    vol: 0.04 + (h % 5) / 100,
    trend: ((h % 7) - 3) / 2500, // -0.0012..+0.0012/dia — personalidades distintas
    spikeBoost: 0.35 + (h % 4) / 10,
  };
}

/* ══ canais ══ */

export type MockOptions = { demoVotacao?: boolean };

export function snapshotIdx(w: Watchlist, now: number): IdxSnapshot {
  const valor = idxValueAt(now, w);
  recordIdxClose(now, valor);
  const synthetic = dailyCandles("sost:idx", 30, now, IDX_AS_SERIES);
  const candles = mergeIdxCandles(synthetic, now);
  const vivo = liveCandle("sost:idx", now, IDX_AS_SERIES);
  // o candle vivo fecha no valor composto real — índice e candles nunca divergem
  vivo.o = round2(idxOpenToday(now, vivo.o));
  vivo.c = round2(valor);
  vivo.h = Math.max(vivo.h, vivo.c);
  vivo.l = Math.min(vivo.l, vivo.c);
  return {
    valor: round2(valor),
    variacaoDia: pctChange(valor, vivo.o),
    candles30d: candles,
    candleVivo: vivo,
    breakdown: (() => {
      const c = idxComponents(now);
      return {
        mencoes: round1(c.mencoes),
        sentimento: round1(c.sentimento),
        seguidores: round1(c.seguidores),
        imprensa: round1(c.imprensa),
      };
    })(),
    fontes: idxFontes(),
  };
}

export function deltaIdx(w: Watchlist, now: number): IdxDelta {
  const snap = snapshotIdx(w, now);
  return {
    valor: snap.valor,
    variacaoDia: snap.variacaoDia,
    candleVivo: snap.candleVivo,
    breakdown: snap.breakdown,
    fontes: snap.fontes,
  };
}

const ECG_POS: SeriesParams = { base: 34, vol: 0.22, spikeBoost: 0.9 };
const ECG_NEG: SeriesParams = { base: 18, vol: 0.3, spikeBoost: 1.4 };

export function snapshotEcg(now: number): EcgSnapshot {
  return {
    h1: {
      pos: pointsWindow("ecg:pos", now, HOUR, 10_000, ECG_POS),
      neg: pointsWindow("ecg:neg", now, HOUR, 10_000, ECG_NEG),
    },
    h24: {
      pos: pointsWindow("ecg:pos", now, 24 * HOUR, 10 * MIN, ECG_POS),
      neg: pointsWindow("ecg:neg", now, 24 * HOUR, 10 * MIN, ECG_NEG),
    },
    d7: {
      pos: pointsWindow("ecg:pos", now, 7 * DAY, HOUR, ECG_POS),
      neg: pointsWindow("ecg:neg", now, 7 * DAY, HOUR, ECG_NEG),
    },
    mencoesMin: round1(seriesValue("ecg:pos", now, ECG_POS) + seriesValue("ecg:neg", now, ECG_NEG)),
  };
}

export function deltaEcg(now: number): EcgDelta {
  return {
    pos: { t: now, v: round1(seriesValue("ecg:pos", now, ECG_POS)) },
    neg: { t: now, v: round1(seriesValue("ecg:neg", now, ECG_NEG)) },
    mencoesMin: round1(seriesValue("ecg:pos", now, ECG_POS) + seriesValue("ecg:neg", now, ECG_NEG)),
  };
}

/* manchetes — pools combinadas com a watchlist, rotação determinística */

const TAPE_NACIONAL: { texto: string; tom: Manchete["tom"] }[] = [
  { texto: "Câmara pauta urgência do projeto de segurança pública", tom: "neu" },
  { texto: "Oposição articula obstrução da pauta econômica do governo", tom: "pos" },
  { texto: "Governo sofre derrota em comissão e recalcula articulação", tom: "pos" },
  { texto: "PL oficializa estratégia de bancada para 2026", tom: "pos" },
  { texto: "Datafolha: avaliação do governo oscila para baixo", tom: "pos" },
  { texto: "STF marca julgamento que mobiliza base evangélica", tom: "neu" },
  { texto: "Hugo Motta sinaliza pauta do plenário para a semana", tom: "neu" },
  { texto: "Esquerda intensifica críticas à liderança da oposição", tom: "neg" },
  { texto: "Bancada evangélica cresce em influência na Câmara", tom: "pos" },
  { texto: "Tarcísio evita confirmar candidatura presidencial", tom: "neu" },
];

const TAPE_RJ: { texto: string; tom: Manchete["tom"] }[] = [
  { texto: "Disputa por federal no RJ esquenta dentro do PL", tom: "neu" },
  { texto: "Sóstenes lidera agenda da oposição e ganha espaço no RJ", tom: "pos" },
  { texto: "Daniela do Waguinho amplia presença na Baixada", tom: "neg" },
  { texto: "Pazuello intensifica agenda em quartéis e igrejas", tom: "neu" },
  { texto: "Talíria Petrone cresce nas redes com pauta social", tom: "neg" },
  { texto: "Doutor Luizinho consolida base na Região Serrana", tom: "neg" },
  { texto: "Igrejas do RJ mobilizam lideranças para 2026", tom: "pos" },
  { texto: "Pesquisa interna aponta vaga em disputa acirrada no RJ", tom: "neu" },
  { texto: "Jordy e Sóstenes disputam mesmo eleitorado no interior", tom: "neu" },
  { texto: "Eleitorado evangélico do RJ deve decidir 8 cadeiras", tom: "pos" },
];

function mancheteAt(trilha: "nacional" | "rj", index: number): Manchete {
  const pool = trilha === "nacional" ? TAPE_NACIONAL : TAPE_RJ;
  const item = pool[((index % pool.length) + pool.length) % pool.length];
  return { id: `${trilha}:${index}`, texto: item.texto, tom: item.tom };
}

export function snapshotTape(now: number): TapeSnapshot {
  const idx = Math.floor(now / (6 * 1000));
  const build = (trilha: "nacional" | "rj") =>
    Array.from({ length: 10 }, (_, i) => mancheteAt(trilha, idx - 9 + i));
  return { nacional: build("nacional"), rj: build("rj") };
}

export function deltaTape(now: number): TapeDelta {
  const idx = Math.floor(now / (6 * 1000));
  const trilha = idx % 2 === 0 ? "nacional" : "rj";
  return { trilha, manchete: mancheteAt(trilha, idx) };
}

export function snapshotQuotesRj(w: Watchlist, now: number): QuotesRjSnapshot {
  const quotes: QuoteRj[] = w.concorrentes_rj.map((c) => {
    const p = concorrenteParams(c.simbolo, c.votos2022);
    const vivo = liveCandle(`conc:${c.simbolo}`, now, p);
    const sparkP: SeriesParams = { base: 100, vol: 0.02, trend: 0.0018, seasonalWeight: 0.02 };
    return {
      simbolo: c.simbolo,
      valor: vivo.c,
      variacao24h: pctChange(vivo.c, vivo.o),
      candles30d: dailyCandles(`conc:${c.simbolo}`, 30, now, p),
      candleVivo: vivo,
      sparkSeguidores: Array.from({ length: 14 }, (_, i) =>
        round1(seriesValue(`seg:${c.simbolo}`, now - (13 - i) * DAY, sparkP)),
      ),
    };
  });
  return { quotes };
}

export function deltaQuotesRj(w: Watchlist, now: number): QuotesRjDelta {
  return {
    quotes: w.concorrentes_rj.map((c) => {
      const p = concorrenteParams(c.simbolo, c.votos2022);
      const vivo = liveCandle(`conc:${c.simbolo}`, now, p);
      return {
        simbolo: c.simbolo,
        valor: vivo.c,
        variacao24h: pctChange(vivo.c, vivo.o),
        candleVivo: vivo,
        sparkLast: round1(
          seriesValue(`seg:${c.simbolo}`, now, { base: 100, vol: 0.02, trend: 0.0018, seasonalWeight: 0.02 }),
        ),
      };
    }),
  };
}

function nacScore(id: string, t: number): number {
  const raw = noise(`nac:${id}`, t, 4) * 62 + spikeAt(`nac:${id}`, t) * 30;
  return Math.max(-100, Math.min(100, Math.round(raw)));
}

function nacQuote(id: string, now: number): QuoteNac {
  const score = nacScore(id, now);
  const before = nacScore(id, now - HOUR);
  return {
    id,
    score,
    dir: score > before + 1 ? "up" : score < before - 1 ? "down" : "flat",
    spark: Array.from({ length: 24 }, (_, i) => nacScore(id, now - (23 - i) * HOUR)),
  };
}

// Mapeia o id do ator nacional → candidato da pesquisa presidencial real.
const ATOR_PARA_CAND: Record<string, CandKey> = {
  lula: "lula",
  "flavio-bolsonaro": "flavio",
  "renan-santos": "renan",
  "ronaldo-caiado": "caiado",
  zema: "zema",
};

export function snapshotQuotesNac(w: Watchlist, now: number): QuotesNacSnapshot {
  const pres = getPresidencial();
  const atores = w.atores_nacionais.map((a) => {
    const q = nacQuote(a.id, now);
    const cand = ATOR_PARA_CAND[a.id];
    const real = cand && pres ? pres[cand] : undefined;
    // intenção de voto REAL (Wikipédia) quando disponível; score acompanha.
    return real ? { ...q, pct: real.pct, dir: real.dir, score: Math.round((real.pct - 25) * 2) } : q;
  });
  return { atores, fonte: getFontePesquisa() ?? undefined, presidencial: getPesquisas().slice(0, 6) };
}

export function deltaQuotesNac(w: Watchlist, now: number): QuotesNacDelta {
  return {
    atores: w.atores_nacionais.map((a) => {
      const q = nacQuote(a.id, now);
      return { id: a.id, score: q.score, dir: q.dir, sparkLast: q.score };
    }),
  };
}

/* alertas — derivados das agendas de spike + eventos do plenário */

const ALERT_SERIES: { seed: string; nivel: Alert["nivel"]; tipo: Alert["tipo"]; titulo: string; corpo: string; tab: string }[] = [
  { seed: "ecg:neg", nivel: "vermelho", tipo: "spike", titulo: "Spike de menções negativas", corpo: "Volume de menções negativas saiu da banda esperada. Abra o eletrocardiograma.", tab: "ticker" },
  { seed: "sost:mencoes", nivel: "amarelo", tipo: "spike", titulo: "Pico de menções ao seu nome", corpo: "Menções em alta acelerada na última hora.", tab: "ticker" },
  { seed: "sost:imprensa", nivel: "amarelo", tipo: "falaram_de_mim", titulo: "Imprensa falou de você", corpo: "Novo pico de citações em veículos monitorados.", tab: "radar" },
  { seed: "redes:crise", nivel: "vermelho", tipo: "crise_rede", titulo: "Possível crise nas redes", corpo: "Z-score de polaridade negativa acima do limiar.", tab: "redes" },
];

export function alertsBetween(from: number, to: number, opts: MockOptions = {}): Alert[] {
  const out: Alert[] = [];
  for (const a of ALERT_SERIES) {
    for (let back = 0; back < 2; back += 1) {
      const dayIndex = Math.floor(to / DAY) - back;
      const start = spikeStart(a.seed, dayIndex);
      if (start !== null && start > from && start <= to) {
        out.push({
          id: `spike:${a.seed}:${dayIndex}`,
          t: start,
          nivel: a.nivel,
          tipo: a.tipo,
          titulo: a.titulo,
          corpo: a.corpo,
          tab: a.tab,
        });
      }
    }
  }
  // início de votação vira alerta
  const vFrom = votacaoJanela(from, opts);
  const vTo = votacaoJanela(to, opts);
  if (!vFrom.ativa && vTo.ativa && vTo.inicio !== null) {
    out.push({
      id: `votacao:${vTo.id}`,
      t: vTo.inicio,
      nivel: "vermelho",
      tipo: "votacao_iniciada",
      titulo: "Votação nominal em andamento",
      corpo: vTo.titulo,
      tab: "plenario",
    });
  }
  return out.sort((x, y) => x.t - y.t);
}

export function snapshotAlerts(now: number, opts: MockOptions = {}): { alertas: Alert[] } {
  // Manchetes reais do Google News (mais novas) na frente dos alertas sintéticos.
  const mock = alertsBetween(now - 24 * HOUR, now, opts).reverse();
  const todos = [...newsAlertasRecentes(20), ...mock].sort((a, b) => b.t - a.t);
  return { alertas: todos.slice(0, 20) };
}

/* plenário — agenda determinística de votações (formato Dados Abertos da Câmara) */

const PAUTAS = [
  "PL 4123/2025 — Endurecimento de penas para crime organizado",
  "PEC 12/2026 — Marco da liberdade religiosa",
  "PL 887/2026 — Desoneração da cesta básica",
  "MP 1234/2026 — Crédito para pequenos negócios",
];

const PL_TRAIDORES_POOL = [
  { nome: "Dep. Fulano de Souza", siglaPartido: "PL", siglaUf: "SP" },
  { nome: "Dep. Beltrano Lima", siglaPartido: "PL", siglaUf: "MG" },
  { nome: "Dep. Sicrano Alves", siglaPartido: "PL", siglaUf: "PR" },
  { nome: "Dep. Mariana Costa", siglaPartido: "PL", siglaUf: "BA" },
];

const VOZES_OPOSICAO = [
  { nome: "Sóstenes Cavalcante", partido: "PL" },
  { nome: "Carlos Jordy", partido: "PL" },
  { nome: "Nikolas Ferreira", partido: "PL" },
  { nome: "Bia Kicis", partido: "PL" },
  { nome: "Marcel van Hattem", partido: "NOVO" },
  { nome: "Evair de Melo", partido: "PP" },
];

function votacaoJanela(now: number, opts: MockOptions = {}) {
  const dayIndex = Math.floor(now / DAY);
  const h = hash(`votacao:${dayIndex}`);
  const d = new Date(now);
  const isWeekday = d.getDay() >= 2 && d.getDay() <= 4; // ter–qui
  const scheduled = isWeekday && h % 2 === 0;
  const startMin = 15 * 60 + (h % 120); // 15:00–17:00
  const inicio = dayIndex * DAY + startMin * MIN;
  const durMs = 45 * MIN;
  let ativa = scheduled && now >= inicio && now <= inicio + durMs;
  let inicioEfetivo: number | null = ativa ? inicio : null;
  if (opts.demoVotacao) {
    // demo: votação sempre ativa, começada há 12 min
    ativa = true;
    inicioEfetivo = now - 12 * MIN;
  }
  return {
    ativa,
    inicio: inicioEfetivo,
    id: `vot:${dayIndex}`,
    titulo: PAUTAS[h % PAUTAS.length],
    orientacaoPL: (h >> 4) % 3 === 0 ? ("Não" as const) : ("Sim" as const),
  };
}

export function snapshotPlenario(now: number, opts: MockOptions = {}): PlenarioState {
  const real = getPlenarioReal();
  if ((real?.votacao || real?.votacaoRecente || real?.historico?.length) && !opts.demoVotacao) {
    const exibir = real.votacao?.emAndamento ? real.votacao : real.votacaoRecente;
    const nominais = exibir ? (real.nominais[exibir.id] ?? []) : [];
    const fidReal = nominais.length ? fidelidadePLDeNominais(nominais) : null;
    const traicoes = exibir?.traicoes.length ?? 0;
    const fidelidadeBase = fidReal?.total ?? 88;
    const com = fidReal?.com ?? fidelidadeBase - traicoes;
    const share = 50 + 13 * noise("plenario:voz", now, 3);
    return {
      votacaoAtiva: Boolean(real.votacao?.emAndamento),
      votacao: real.votacao?.emAndamento ? real.votacao : null,
      votacaoRecente: real.votacaoRecente ?? null,
      historico: real.historico,
      votosDeputado: real.votosDeputado,
      orgaosMonitorados: real.orgaosMonitorados,
      fidelidade: {
        com,
        total: fidelidadeBase,
        pct: fidReal?.pct ?? round1((com / fidelidadeBase) * 100),
      },
      caboDeGuerra: {
        temaOposicao: "Segurança pública e anistia",
        temaGoverno: "Isenção do IR e salário mínimo",
        shareOposicao: round1(Math.max(25, Math.min(75, share))),
      },
      vozes: VOZES_OPOSICAO.map((v, i) => ({
        ...v,
        mencoes: Math.round(seriesValue(`voz:${v.nome}`, now, { base: 320 - i * 38, vol: 0.2, spikeBoost: 0.8 })),
      })).sort((a, b) => b.mencoes - a.mencoes),
      fonte: "real",
    };
  }

  const j = votacaoJanela(now, opts);
  const fidelidadeBase = 88;
  let votacao: PlenarioState["votacao"] = null;

  if (j.ativa && j.inicio !== null) {
    const elapsed = (now - j.inicio) / (45 * MIN); // 0..1
    const progress = 1 / (1 + Math.exp(-9 * (elapsed - 0.45))); // sigmóide
    const votantes = Math.round(480 * Math.min(1, progress));
    const proGoverno = 0.46 + 0.05 * noise(`${j.id}:placar`, now, 2);
    const simEhOposicao = j.orientacaoPL === "Sim";
    const ladoOposicao = Math.round(votantes * (1 - proGoverno));
    const ladoGoverno = votantes - ladoOposicao;
    const sim = simEhOposicao ? ladoOposicao : ladoGoverno;
    const nao = votantes - sim;
    const nTraicoes = progress > 0.4 ? 2 + (hash(j.id) % 3) : 0;
    votacao = {
      id: j.id,
      titulo: j.titulo,
      orientacaoPL: j.orientacaoPL,
      sim,
      nao,
      outros: Math.round(votantes * 0.025),
      emAndamento: true,
      traicoes: PL_TRAIDORES_POOL.slice(0, nTraicoes).map((t) => ({
        deputado_: { nome: t.nome, siglaPartido: t.siglaPartido, siglaUf: t.siglaUf },
        tipoVoto: j.orientacaoPL === "Sim" ? ("Não" as const) : ("Sim" as const),
      })),
    };
  }

  const traicoes = votacao?.traicoes.length ?? 0;
  const com = fidelidadeBase - traicoes;
  const share = 50 + 13 * noise("plenario:voz", now, 3);
  return {
    votacaoAtiva: j.ativa,
    votacao,
    fidelidade: { com, total: fidelidadeBase, pct: round1((com / fidelidadeBase) * 100) },
    caboDeGuerra: {
      temaOposicao: "Segurança pública e anistia",
      temaGoverno: "Isenção do IR e salário mínimo",
      shareOposicao: round1(Math.max(25, Math.min(75, share))),
    },
    vozes: VOZES_OPOSICAO.map((v, i) => ({
      ...v,
      mencoes: Math.round(seriesValue(`voz:${v.nome}`, now, { base: 320 - i * 38, vol: 0.2, spikeBoost: 0.8 })),
    })).sort((a, b) => b.mencoes - a.mencoes),
    fonte: "modelado",
  };
}

/* rio.pulsos */

export function snapshotRio(w: Watchlist, now: number): RioPulsos {
  const municipios = REGIONS.flatMap((r) => r.municipios.map((m) => ({ m, regiao: r.id })));
  const tick = Math.floor(now / 8000);
  const pulsos = Array.from({ length: 7 }, (_, i) => {
    const pick = municipios[hash(`pulso:${tick}:${i}`) % municipios.length];
    return {
      municipio: pick.m.nome,
      regiao: pick.regiao,
      intensidade: round1(0.3 + 0.7 * ((hash(`pi:${tick}:${i}`) % 100) / 100)),
    };
  });
  return {
    pulsos,
    regioes: REGIONS.map((r) => ({
      id: r.id,
      nome: r.nome,
      mencoes: Math.round(seriesValue(`rio:${r.id}`, now, { base: 80 + r.intencaoVoto * 14, vol: 0.18, spikeBoost: 0.6 })),
      spark: Array.from({ length: 12 }, (_, i) =>
        round1(seriesValue(`rio:${r.id}`, now - (11 - i) * 2 * HOUR, { base: 80 + r.intencaoVoto * 14, vol: 0.18, spikeBoost: 0.6 })),
      ),
    })),
    racing: w.concorrentes_rj.map((c) => ({
      simbolo: c.simbolo,
      mencoes: Math.round(seriesValue(`riomen:${c.simbolo}`, now, { base: 240 + (hash(c.simbolo) % 200), vol: 0.16, spikeBoost: 0.7 })),
      crescimento: round1(noise(`riocresc:${c.simbolo}`, now, 2) * 8),
    })),
    evangelico: w.ecossistema_evangelico.map((e) => ({
      id: e.id,
      atividade: Math.round(50 + 46 * noise(`evang:${e.id}`, now, 3)),
    })),
  };
}

/* radar */

const MUNICAO_POOL = [
  { titulo: "Governo corta verba de programa social e gera reação", veiculo: "O Globo" },
  { titulo: "Inflação de alimentos volta a subir e pressiona Planalto", veiculo: "Folha" },
  { titulo: "Obra federal prometida no RJ completa 2 anos parada", veiculo: "Extra" },
  { titulo: "Ministério é alvo de operação por suspeita de desvio", veiculo: "Metrópoles" },
  { titulo: "Base do governo racha em votação-chave na Câmara", veiculo: "Estadão" },
  { titulo: "Avaliação negativa do governo bate recorde no Sudeste", veiculo: "g1 Rio" },
];

const FALARAM_POOL = [
  { titulo: "Sóstenes articula frente da oposição para pauta de segurança", tom: "pos" as const, veiculo: "O Globo" },
  { titulo: "Líder do PL cobra pauta da anistia em coletiva", tom: "neu" as const, veiculo: "Metrópoles" },
  { titulo: "Oposição sob pressão: Sóstenes responde críticas da esquerda", tom: "neg" as const, veiculo: "Folha" },
  { titulo: "Bancada evangélica celebra atuação do deputado fluminense", tom: "pos" as const, veiculo: "Gazeta do Povo" },
  { titulo: "Sóstenes confirma pré-campanha à reeleição no RJ", tom: "neu" as const, veiculo: "O Dia" },
];

const PAUTA_POOL = [
  { titulo: "Semana decisiva: pauta de segurança domina a Câmara", tom: "neu" as const, veiculo: "Congresso em Foco" },
  { titulo: "PEC da liberdade religiosa entra na ordem do dia", tom: "pos" as const, veiculo: "g1" },
  { titulo: "Orçamento 2027 começa a ser discutido nas comissões", tom: "neu" as const, veiculo: "Valor" },
  { titulo: "CPI ameaça pautar governo nas próximas semanas", tom: "pos" as const, veiculo: "Metrópoles" },
];

function radarItems(pool: { titulo: string; veiculo: string; tom?: "pos" | "neg" | "neu" }[], seed: string, now: number, count: number) {
  const tick = Math.floor(now / (10 * MIN));
  return Array.from({ length: count }, (_, i) => {
    const item = pool[(tick + i) % pool.length];
    return {
      id: `${seed}:${tick - i}`,
      t: now - i * (38 * MIN) - (hash(`${seed}:${tick - i}`) % (20 * MIN)),
      titulo: item.titulo,
      veiculo: item.veiculo,
      tom: item.tom ?? ("neg" as const),
      alcance: Math.round(seriesValue(`alc:${seed}:${i}`, now, { base: 120 + (hash(`${seed}${i}`) % 900), vol: 0.1 })),
    };
  });
}

export function snapshotRadar(w: Watchlist, now: number): RadarState {
  return {
    falaramDeMim: radarItems(FALARAM_POOL, "fdm", now, 5),
    pauta: radarItems(PAUTA_POOL, "pauta", now, 4),
    municao: radarItems(MUNICAO_POOL, "mun", now, 6).sort((a, b) => b.alcance - a.alcance),
    colunistas: w.colunistas.map((c) => ({
      nome: c.nome,
      veiculo: c.veiculo,
      tom: round2(noise(`col:${c.nome}`, now, 2) * 0.85),
      alcance: Math.round(300 + 1700 * ((hash(`cola:${c.nome}`) % 100) / 100)),
    })),
  };
}

/* redes */

const PLATAFORMAS: { rede: "instagram" | "x" | "youtube" | "facebook" | "tiktok"; base: number }[] = [
  { rede: "instagram", base: 412_000 },
  { rede: "x", base: 268_000 },
  { rede: "youtube", base: 96_000 },
  { rede: "facebook", base: 351_000 },
  { rede: "tiktok", base: 124_000 },
];

export function snapshotRedes(w: Watchlist, now: number): RedesState {
  const postStart = Math.floor(now / (4 * HOUR)) * 4 * HOUR; // "último post" a cada 4h
  const minutes = Math.min(60, Math.floor((now - postStart) / MIN));
  const curva1h: Point[] = Array.from({ length: Math.max(1, minutes) }, (_, i) => ({
    t: postStart + i * MIN,
    v: Math.round(seriesValue("post:curva", postStart + i * MIN, { base: 90, vol: 0.3, spikeBoost: 1.2 }) * (i + 2) * 0.6),
  }));
  const bandaP25 = Array.from({ length: 60 }, (_, i) => Math.round(38 * (i + 2) * 0.6));
  const bandaP75 = Array.from({ length: 60 }, (_, i) => Math.round(118 * (i + 2) * 0.6));
  const lastV = curva1h[curva1h.length - 1]?.v ?? 0;
  const refIdx = Math.min(curva1h.length - 1, 59);
  const selo = lastV > bandaP75[refIdx] ? ("fogo" as const) : lastV < bandaP25[refIdx] ? ("sono" as const) : ("normal" as const);
  const zscore = round2(2.4 * spikeAt("redes:crise", now) + noise("redes:z", now, 2) * 0.6);

  return {
    plataformas: PLATAFORMAS.map((p) => ({
      rede: p.rede,
      seguidores: Math.round(seriesValue(`segs:${p.rede}`, now, { base: p.base, vol: 0.004, trend: 0.0019, seasonalWeight: 0.01 })),
      deltaDia: Math.round(noise(`segd:${p.rede}`, now, 2) * 900 + 420),
      engajamento: round1(3.2 + noise(`eng:${p.rede}`, now, 2) * 1.6),
    })),
    ultimoPost: {
      rede: "instagram",
      texto: "Hoje a oposição mostrou que tem voz: pauta da segurança avançou. Deus seja louvado. 🙏",
      t: postStart,
      curtidas: Math.round(lastV * 14.2),
      comentarios: Math.round(lastV * 1.7),
      compartilhamentos: Math.round(lastV * 2.3),
      views: Math.round(lastV * 96),
      curva1h,
      bandaP25,
      bandaP75,
      selo,
    },
    racingSemanal: [
      { nome: w.principal.nome, cor: w.principal.cor, engajamento7d: Math.round(seriesValue("rc:sost", now, { base: 1480, vol: 0.12, spikeBoost: 0.8 })) },
      ...w.concorrentes_rj.map((c) => ({
        nome: c.nome,
        cor: c.cor,
        engajamento7d: Math.round(seriesValue(`rc:${c.simbolo}`, now, { base: 700 + (hash(c.simbolo) % 700), vol: 0.14, spikeBoost: 0.7 })),
      })),
      { nome: "Nikolas Ferreira", cor: "#9ca3af", engajamento7d: Math.round(seriesValue("rc:nikolas", now, { base: 4200, vol: 0.1, spikeBoost: 0.9 })) },
      { nome: "Lindbergh Farias", cor: "#f87171", engajamento7d: Math.round(seriesValue("rc:lindbergh", now, { base: 980, vol: 0.13, spikeBoost: 0.6 })) },
    ].sort((a, b) => b.engajamento7d - a.engajamento7d),
    crise: {
      ativo: zscore > 2,
      zscore,
      polaridade: zscore > 2 ? "neg" : "neu",
    },
  };
}

/* c2026 */

const ELEITORES_RJ = 12_420_000;

export function snapshotC2026(now: number): C2026State {
  const timeline = getRaceTimeline("presidente", "all");
  const series = timeline.datasets.slice(0, 3).map((ds) => {
    const media = ds.data.map((v) => (typeof v === "number" ? v : 0));
    return {
      nome: ds.label,
      cor: ds.color,
      media,
      lo: media.map((v, i) => round1(v - 1.6 - Math.abs(noise(`lo:${ds.label}`, REF + i * DAY)) * 1.4)),
      hi: media.map((v, i) => round1(v + 1.6 + Math.abs(noise(`hi:${ds.label}`, REF + i * DAY)) * 1.4)),
    };
  });

  const { coeficiente } = calcularQuociente({
    eleitores: ELEITORES_RJ,
    comparecimento: 0.74,
    invalidos: 0.1,
    vagas: 46,
    margem: 0.15,
  });
  const votosLegendaPL = Math.round(seriesValue("pl:legenda", now, { base: 1_840_000, vol: 0.015, trend: 0.0004, seasonalWeight: 0 }));
  const bancada = projetarBancada({ votosLegenda: votosLegendaPL, quociente: coeficiente });

  // janela de registro de pesquisas (PesqEle) — marco fixo da eleição de 04/10/2026
  const alvo = Date.UTC(2026, 9, 4);
  const diasRestantes = Math.max(0, Math.ceil((alvo - now) / DAY));

  return {
    pollOfPolls: { labels: timeline.labels, series },
    bancada: {
      quociente: coeficiente,
      votosLegendaPL,
      base: bancada.base,
      faixa: bancada.faixa,
      posicaoLista: 3 + (hash(`pos:${Math.floor(now / DAY)}`) % 2),
    },
    pesqEle: {
      proximaJanela: "04/10/2026 — 1º turno",
      diasRestantes,
    },
    polymarket: [
      { mercado: "Direita vence o Planalto em 2026", prob: round1(46 + noise("poly:1", now, 2) * 7) },
      { mercado: "PL é a maior bancada da Câmara", prob: round1(62 + noise("poly:2", now, 2) * 6) },
      { mercado: "Lula concorre à reeleição", prob: round1(71 + noise("poly:3", now, 2) * 5) },
    ],
    aprovacao: {
      aprova: round1(38 + noise("apr:g", now, 2) * 3),
      desaprova: round1(56 - noise("apr:g", now, 2) * 3),
      segmentos: [
        { seg: "Evangélicos", aprova: round1(27 + noise("apr:ev", now, 2) * 3), desaprova: round1(67 - noise("apr:ev", now, 2) * 3) },
        { seg: "Sudeste", aprova: round1(34 + noise("apr:se", now, 2) * 3), desaprova: round1(60 - noise("apr:se", now, 2) * 3) },
        { seg: "Até 2 SM", aprova: round1(46 + noise("apr:2sm", now, 2) * 3), desaprova: round1(48 - noise("apr:2sm", now, 2) * 3) },
        { seg: "RJ", aprova: round1(33 + noise("apr:rj", now, 2) * 3), desaprova: round1(61 - noise("apr:rj", now, 2) * 3) },
      ],
    },
  };
}

/* ══ orquestração (consumida pela rota SSE) ══ */

export const CHANNEL_CADENCE_MS: Record<Exclude<Channel, "watchlist">, number> = {
  "idx.sost": 2000,
  "sent.ecg": 2000,
  "ticker.tape": 6000,
  "quotes.rj": 5000,
  "quotes.nac": 5000,
  alerts: 1000, // checagem; só emite quando há alerta novo
  plenario: 10_000, // 1s quando votação ativa (a rota ajusta)
  "rio.pulsos": 8000,
  radar: 10_000,
  redes: 3000,
  c2026: 30_000,
  equipe: 2000,
  oportunidades: 30_000,
  pesquisas: 5000,
  gastos: 15_000,
  voz: 2500,
};

export function buildAllSnapshots(w: Watchlist, now: number, opts: MockOptions = {}): Envelope[] {
  let seq = 0;
  const env = (ch: Channel, data: unknown): Envelope => ({ ch, kind: "snapshot", seq: (seq += 1), t: now, data });
  return [
    env("watchlist", w),
    env("idx.sost", snapshotIdx(w, now)),
    env("sent.ecg", snapshotEcg(now)),
    env("ticker.tape", snapshotTape(now)),
    env("quotes.rj", snapshotQuotesRj(w, now)),
    env("quotes.nac", snapshotQuotesNac(w, now)),
    env("alerts", snapshotAlerts(now, opts)),
    env("plenario", snapshotPlenario(now, opts)),
    env("rio.pulsos", snapshotRio(w, now)),
    env("radar", snapshotRadar(w, now)),
    env("redes", v2.snapshotRedesV2(w, now)),
    env("c2026", snapshotC2026(now)),
    env("equipe", v2.snapshotEquipe(now)),
    env("oportunidades", v2.snapshotOportunidades(w, now)),
    env("pesquisas", v2.snapshotPesquisas(now)),
    env("gastos", v2.snapshotGastos(now)),
    env("voz", v2.snapshotVoz(now)),
  ];
}

/** Delta de um canal (alerts é tratado à parte pela rota, via alertsBetween). */
export function buildDelta(ch: Exclude<Channel, "watchlist" | "alerts">, w: Watchlist, now: number, opts: MockOptions = {}): unknown {
  switch (ch) {
    case "idx.sost":
      return deltaIdx(w, now);
    case "sent.ecg":
      return deltaEcg(now);
    case "ticker.tape":
      return deltaTape(now);
    case "quotes.rj":
      return deltaQuotesRj(w, now);
    case "quotes.nac":
      return deltaQuotesNac(w, now);
    case "plenario":
      return snapshotPlenario(now, opts);
    case "rio.pulsos":
      return snapshotRio(w, now);
    case "radar":
      return snapshotRadar(w, now);
    case "redes":
      return v2.deltaRedesV2(w, now);
    case "c2026":
      return snapshotC2026(now);
    case "equipe":
      return v2.deltaEquipe(now);
    case "oportunidades":
      return v2.snapshotOportunidades(w, now);
    case "pesquisas":
      return v2.deltaPesquisas(now);
    case "gastos":
      return v2.snapshotGastos(now);
    case "voz":
      return v2.deltaVoz(now);
  }
}

export function isVotacaoAtiva(now: number, opts: MockOptions = {}): boolean {
  return votacaoJanela(now, opts).ativa;
}
