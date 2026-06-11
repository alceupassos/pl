// Fonte REAL para o cockpit — GDELT DOC 2.0 (grátis, sem chave).
// https://api.gdeltproject.org/api/v2/doc/doc
//
// Três feeds, todos sobre o termo principal da watchlist:
//   • imprensa   → mode=timelinevol  (intensidade de cobertura)   → índice ~100
//   • sentimento → mode=timelinetone (tom médio das notícias)     → índice ~100
//   • alertas    → mode=artlist      (manchetes reais)            → Alert[]
//
// Regras de ouro:
//  • os getters são SÍNCRONOS e nunca lançam — o tick do SSE só lê cache.
//  • toda chamada ao GDELT passa por uma FILA com ≥6s de espaçamento (o limite
//    é 1 req/5s) — várias conexões compartilham a mesma atualização.
//  • falhou (429/rede/JSON inválido)? mantém o último bom; sem nenhum, os
//    getters devolvem null/[] e o live-mock cai no sintético. Nunca quebra.
//  • o último bom é persistido em data/ para warm-start após restart/deploy.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Alert } from "@/lib/live-schemas";

const TTL_MS = 15 * 60 * 1000; // 15 min — muito acima da etiqueta do GDELT
const FETCH_TIMEOUT_MS = 20_000;
const MIN_GAP_MS = 6_000; // espaçamento entre chamadas ao GDELT (limite é 5s)
const CACHE_FILE = join(process.cwd(), "data", "gdelt-cache.json");

// Faixa sã dos índices — protege o headline de spikes/zeros bizarros.
const IDX_MIN = 40;
const IDX_MAX = 220;
const MAX_ALERTAS = 50;

type NumCache = { at: number; value: number | null };

type DiskShape = { imprensa?: number; sentimento?: number };

// ── estado em memória ────────────────────────────────────────────────────────
let imprensa: NumCache = { at: 0, value: null };
let sentimento: NumCache = { at: 0, value: null };
let alertas: Alert[] = []; // rolling, mais novo primeiro
const urlsVistas = new Set<string>();
let inFlight = false;

// Warm-start: reidrata os índices do disco (após deploy/restart).
(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8")) as DiskShape;
    if (typeof raw.imprensa === "number") imprensa = { at: 0, value: raw.imprensa };
    if (typeof raw.sentimento === "number") sentimento = { at: 0, value: raw.sentimento };
  } catch {
    /* primeira execução — sem cache em disco */
  }
})();

// ── getters síncronos (lidos pelo live-mock / rota SSE) ──────────────────────

/** Índice de imprensa real (~100). null = sem sinal → usar o sintético. */
export function getImprensaIndex(): number | null {
  return imprensa.value;
}

/** Índice de sentimento real (~100; >100 = imprensa mais positiva). */
export function getSentimentoIndex(): number | null {
  return sentimento.value;
}

/** Alertas reais (manchetes) com tempo de DESCOBERTA em (from, to]. */
export function realAlertasBetween(from: number, to: number): Alert[] {
  return alertas.filter((a) => a.t > from && a.t <= to).sort((x, y) => x.t - y.t);
}

/** Backlog de alertas reais (mais novo primeiro) — para o snapshot inicial. */
export function realAlertasRecentes(max = 20): Alert[] {
  return alertas.slice(0, max);
}

/**
 * Dispara um refresh de todos os feeds vencidos. NÃO bloqueia: pode ser chamado
 * do loop de 1s do SSE à vontade — só dispara a cada TTL e dedup entre conexões.
 */
export function ensureFreshGdelt(termos: string[]): void {
  if (inFlight) return;
  const venceu =
    Date.now() - imprensa.at >= TTL_MS ||
    Date.now() - sentimento.at >= TTL_MS ||
    imprensa.value === null;
  if (!venceu) return;
  inFlight = true;
  void refreshAll(termos).finally(() => {
    inFlight = false;
  });
}

// ── busca (assíncrona, fora de banda) ────────────────────────────────────────

const termoPadrao = "Sóstenes Cavalcante";

function urlFor(termo: string, extra: Record<string, string>): string {
  const params = new URLSearchParams({ query: `"${termo}"`, format: "json", ...extra });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

// Fila global: garante MIN_GAP_MS entre quaisquer chamadas ao GDELT.
let ultimaChamada = 0;
async function gdeltGet(url: string): Promise<string | null> {
  const espera = MIN_GAP_MS - (Date.now() - ultimaChamada);
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  ultimaChamada = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "sostenes-cockpit/1.0 (campaign monitor)" },
    });
    const body = await res.text();
    return res.ok ? body : null; // 429/5xx → mantém o último bom
  } catch {
    return null; // rede/abort
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAll(termos: string[]): Promise<void> {
  const termo = termos[0] ?? termoPadrao;

  // 1) imprensa — volume de cobertura
  const volBody = await gdeltGet(urlFor(termo, { mode: "timelinevol", timespan: "1week" }));
  const volIdx = volBody ? indiceDeTimeline(volBody) : null;
  if (volIdx !== null) imprensa = { at: Date.now(), value: volIdx };

  // 2) sentimento — tom médio das notícias (-100..100) → índice ~100
  const toneBody = await gdeltGet(urlFor(termo, { mode: "timelinetone", timespan: "1week" }));
  const toneIdx = toneBody ? indiceDeTom(toneBody) : null;
  if (toneIdx !== null) sentimento = { at: Date.now(), value: toneIdx };

  // 3) alertas — manchetes recentes (descoberta = agora)
  const artBody = await gdeltGet(
    urlFor(termo, { mode: "artlist", maxrecords: "20", timespan: "1day", sort: "datedesc" }),
  );
  if (artBody) ingerirArtigos(artBody);

  persist();
}

// ── parsers (exportados para o script de teste exercitar) ────────────────────

/** Extrai os valores numéricos de um timeline do GDELT (vol ou tone). */
function valoresDeTimeline(body: string): number[] | null {
  const trimmed = body.trimStart();
  if (!trimmed.startsWith("{")) return null; // throttle vem em texto puro
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const data = (json as { timeline?: { data?: { value?: number }[] }[] }).timeline?.[0]?.data;
  if (!Array.isArray(data)) return null;
  const vs = data
    .map((d) => d.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return vs.length >= 3 ? vs : null;
}

/** Volume → índice ~100: cobertura recente vs mediana da janela. */
export function indiceDeTimeline(body: string): number | null {
  const vs = valoresDeTimeline(body);
  if (!vs) return null;
  const recente = (vs[vs.length - 1] + vs[vs.length - 2]) / 2;
  const baseline = mediana(vs) || media(vs);
  if (baseline <= 0) return null;
  return round1(clamp((recente / baseline) * 100, IDX_MIN, IDX_MAX));
}

/** Tom médio (-100..100, tipicamente -10..10) → índice ~100 (100 = neutro). */
export function indiceDeTom(body: string): number | null {
  const vs = valoresDeTimeline(body);
  if (!vs) return null;
  const tomRecente = (vs[vs.length - 1] + vs[vs.length - 2]) / 2;
  return round1(clamp(100 + tomRecente * 5, IDX_MIN, IDX_MAX));
}

function ingerirArtigos(body: string): void {
  const trimmed = body.trimStart();
  if (!trimmed.startsWith("{")) return;
  let arts: { url?: string; title?: string; domain?: string }[] | undefined;
  try {
    arts = (JSON.parse(trimmed) as { articles?: typeof arts }).articles;
  } catch {
    return;
  }
  if (!Array.isArray(arts)) return;
  const agora = Date.now();
  const novos: Alert[] = [];
  for (const art of arts) {
    if (!art.url || !art.title || urlsVistas.has(art.url)) continue;
    urlsVistas.add(art.url);
    novos.push({
      id: `gdelt:${hash(art.url)}`,
      t: agora, // tempo de DESCOBERTA — entra na janela do delta do SSE
      nivel: "info",
      tipo: "falaram_de_mim",
      titulo: truncar(art.title, 90),
      corpo: art.domain ? `Imprensa · ${art.domain}` : "Imprensa",
      tab: "radar",
    });
  }
  if (novos.length) {
    alertas = [...novos, ...alertas].slice(0, MAX_ALERTAS);
  }
}

function persist(): void {
  try {
    const data: DiskShape = {};
    if (imprensa.value !== null) data.imprensa = imprensa.value;
    if (sentimento.value !== null) data.sentimento = sentimento.value;
    writeFileSync(CACHE_FILE, `${JSON.stringify(data)}\n`);
  } catch {
    /* FS read-only — segue só com cache em memória */
  }
}

// ── utilitários ──────────────────────────────────────────────────────────────
function mediana(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function media(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
function truncar(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
