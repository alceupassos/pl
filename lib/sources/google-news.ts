// Fonte REAL primária de imprensa — Google News RSS (grátis, SEM chave, SEM o
// throttle agressivo do GDELT). Busca por nome do candidato e devolve ~100
// manchetes recentes com data de publicação.
// https://news.google.com/rss/search?q=...&hl=pt-BR&gl=BR&ceid=BR:pt
//
// Dois sinais derivados do feed (por TERMO/candidato):
//   • imprensa → índice ~100 a partir do VOLUME diário de matérias (cobertura
//     recente vs mediana da janela). Entra em idx.sost.breakdown.imprensa e no
//     índice por candidato (lib/index-real.ts).
//   • alertas  → as manchetes mais novas viram Alert (tipo "falaram_de_mim"),
//     com tempo de DESCOBERTA (igual ao gdelt) para casar na janela do delta SSE.
//
// Regras de ouro (idênticas ao lib/sources/gdelt.ts):
//   • getters SÍNCRONOS, nunca lançam — o tick do SSE só lê cache.
//   • busca assíncrona fora de banda (ensureFreshNews*), TTL + guarda "em voo".
//   • falhou? mantém o último bom; sem nenhum, devolve null/[]. Nunca quebra.
//   • índices persistidos por termo em data/ para warm-start após restart/deploy.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { XMLParser } from "fast-xml-parser";

import type { Alert } from "@/lib/live-schemas";

const TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
const CACHE_FILE = join(process.cwd(), "data", "google-news-cache.json");
const MAX_ALERTAS = 50;
const DIA_MS = 24 * 60 * 60 * 1000;
const TERMO_PADRAO = "Sóstenes Cavalcante";

type TermoState = {
  at: number;
  imprensa: number | null;
  manchetes: string[]; // últimos títulos do feed (insumo do sentimento), todo fetch
  alertas: Alert[]; // rolling, mais novo primeiro (radar — com dedup)
  guidsVistos: Set<string>;
  inFlight: boolean;
};

const byTermo = new Map<string, TermoState>();
let principalTermo = TERMO_PADRAO;

function st(termo: string): TermoState {
  let s = byTermo.get(termo);
  if (!s) {
    s = { at: 0, imprensa: null, manchetes: [], alertas: [], guidsVistos: new Set(), inFlight: false };
    byTermo.set(termo, s);
  }
  return s;
}

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    // Formato novo: { termos: { [termo]: number } }. Formato antigo: { imprensa: number }.
    if (raw && typeof raw.termos === "object" && raw.termos) {
      for (const [termo, v] of Object.entries(raw.termos)) {
        if (typeof v === "number" && Number.isFinite(v)) st(termo).imprensa = v; // at=0 força refresh
      }
    } else if (typeof raw.imprensa === "number" && Number.isFinite(raw.imprensa)) {
      st(TERMO_PADRAO).imprensa = raw.imprensa;
    }
  } catch {
    /* primeira execução */
  }
})();

// ── getters síncronos (POR TERMO) ─────────────────────────────────────────────

/** Índice de imprensa real (~100) do volume de notícias para um termo. */
export function getNewsImprensaFor(termo: string): number | null {
  return byTermo.get(termo)?.imprensa ?? null;
}

/** Textos das manchetes recentes do termo — insumo para o sidecar de sentimento. */
export function getManchetesTextoFor(termo: string, max = 30): string[] {
  return (byTermo.get(termo)?.manchetes ?? []).slice(0, max);
}

/** Dispara refresh do termo se o cache venceu e não há busca em voo. Não bloqueia. */
export function ensureFreshNewsFor(termo: string): void {
  const s = st(termo);
  if (s.inFlight) return;
  if (Date.now() - s.at < TTL_MS && s.imprensa !== null) return;
  s.inFlight = true;
  void refresh(termo).finally(() => {
    s.inFlight = false;
  });
}

/** Atualiza imprensa para vários candidatos de uma vez. */
export function ensureFreshNewsAll(termos: string[]): void {
  for (const termo of termos) if (termo) ensureFreshNewsFor(termo);
}

/** Termo do candidato principal (para os getters de compatibilidade). */
export function getPrincipalTermo(): string {
  return principalTermo;
}

// ── compat: APIs antigas operam sobre o termo do principal ─────────────────────

export function getNewsImprensa(): number | null {
  return getNewsImprensaFor(principalTermo);
}

export function getManchetesTexto(max = 30): string[] {
  return getManchetesTextoFor(principalTermo, max);
}

export function newsAlertasBetween(from: number, to: number): Alert[] {
  return (byTermo.get(principalTermo)?.alertas ?? [])
    .filter((a) => a.t > from && a.t <= to)
    .sort((x, y) => x.t - y.t);
}

export function newsAlertasRecentes(max = 20): Alert[] {
  return (byTermo.get(principalTermo)?.alertas ?? []).slice(0, max);
}

export function ensureFreshNews(termos: string[]): void {
  principalTermo = termos[0] ?? principalTermo;
  ensureFreshNewsFor(principalTermo);
}

// ── busca + parse ────────────────────────────────────────────────────────────

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function urlFor(termo: string): string {
  const params = new URLSearchParams({ q: `"${termo}"`, hl: "pt-BR", gl: "BR", ceid: "BR:pt" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

type ItemRaw = {
  title?: string;
  guid?: string | { "#text"?: string };
  pubDate?: string;
  source?: string | { "#text"?: string };
};

async function refresh(termo: string): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let xml: string;
    try {
      const res = await fetch(urlFor(termo || TERMO_PADRAO), {
        signal: ctrl.signal,
        // Google News exige um UA de browser; fetch segue o 302 automaticamente.
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });
      xml = await res.text();
      if (!res.ok) return;
    } finally {
      clearTimeout(timer);
    }

    const itens = extrairItens(xml);
    if (!itens.length) return;

    const s = st(termo);
    // Manchetes para o sentimento: SEMPRE os últimos títulos do feed (sem o
    // dedup dos alertas), garantindo ≥5 textos quando há cobertura.
    s.manchetes = itens
      .map((it) => it.titulo)
      .filter((t) => t.trim().length > 0)
      .slice(0, 30);
    const idx = indiceDeVolume(itens);
    if (idx !== null) {
      s.at = Date.now();
      s.imprensa = idx;
      persist();
    }
    ingerirAlertas(termo, itens);
  } catch {
    /* rede/abort — mantém o último bom */
  }
}

type Item = { titulo: string; fonte: string; guid: string; t: number };

/** Extrai itens do RSS (title sem o sufixo " - Fonte", pubDate em ms). */
function extrairItens(xml: string): Item[] {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const raw = (doc as { rss?: { channel?: { item?: ItemRaw | ItemRaw[] } } }).rss?.channel?.item;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: Item[] = [];
  for (const it of arr) {
    const tituloFull = typeof it.title === "string" ? it.title : "";
    if (!tituloFull) continue;
    const fonte =
      typeof it.source === "object" && it.source && "#text" in it.source
        ? (it.source["#text"] ?? "")
        : "";
    // O title vem "Manchete - Fonte"; tira o sufixo da fonte quando presente.
    const titulo = fonte ? tituloFull.replace(new RegExp(` - ${escapeRe(fonte)}$`), "") : tituloFull;
    const guidRaw = typeof it.guid === "object" && it.guid ? (it.guid["#text"] ?? "") : it.guid ?? "";
    const guid = String(guidRaw) || hash(tituloFull);
    const t = it.pubDate ? Date.parse(it.pubDate) : NaN;
    out.push({ titulo, fonte, guid, t: Number.isFinite(t) ? t : 0 });
  }
  return out;
}

/**
 * Volume de cobertura COMPARÁVEL entre candidatos: nº de matérias nos últimos 7
 * dias (relativo ao item mais novo do feed). Quem tem mais imprensa pontua mais;
 * o z-score (lib/index-real.ts) normaliza vs. o páreo. (Antes era ritmo-recente ÷
 * baseline-da-janela, que estourava o teto 220 para TODOS por causa do viés de
 * recência do Google News RSS — não diferenciava ninguém.)
 */
function indiceDeVolume(itens: Item[]): number | null {
  const datas = itens.map((i) => i.t).filter((t) => t > 0);
  if (datas.length < 3) return null;
  const maxT = Math.max(...datas);
  return datas.filter((t) => maxT - t <= 7 * DIA_MS).length;
}

function ingerirAlertas(termo: string, itens: Item[]): void {
  const s = st(termo);
  const agora = Date.now();
  const novos: Alert[] = [];
  for (const it of itens) {
    if (s.guidsVistos.has(it.guid)) continue;
    s.guidsVistos.add(it.guid);
    novos.push({
      id: `gnews:${hash(it.guid)}`,
      t: agora, // descoberta — entra na janela do delta SSE
      nivel: "info",
      tipo: "falaram_de_mim",
      titulo: truncar(it.titulo, 90),
      corpo: it.fonte ? `Imprensa · ${it.fonte}` : "Imprensa",
      tab: "radar",
    });
  }
  // Só empilha como "novo" se já tínhamos visto algo antes (1º fetch popula o
  // "seen" sem despejar 100 alertas de uma vez na tela).
  if (novos.length && s.guidsVistos.size > novos.length) {
    s.alertas = [...novos, ...s.alertas].slice(0, MAX_ALERTAS);
  } else if (!s.alertas.length) {
    s.alertas = novos.slice(0, 8);
  }
}

function persist(): void {
  try {
    const termos: Record<string, number> = {};
    for (const [termo, s] of byTermo) if (s.imprensa !== null) termos[termo] = s.imprensa;
    writeFileSync(CACHE_FILE, `${JSON.stringify({ at: Date.now(), termos })}\n`);
  } catch {
    /* FS read-only */
  }
}

// ── utils ────────────────────────────────────────────────────────────────────
function truncar(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
