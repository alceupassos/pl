// Fonte REAL primária de imprensa — Google News RSS (grátis, SEM chave, SEM o
// throttle agressivo do GDELT). Busca por nome do candidato e devolve ~100
// manchetes recentes com data de publicação.
// https://news.google.com/rss/search?q=...&hl=pt-BR&gl=BR&ceid=BR:pt
//
// Dois sinais derivados do feed:
//   • imprensa → índice ~100 a partir do VOLUME diário de matérias (cobertura
//     recente vs mediana da janela). Entra em idx.sost.breakdown.imprensa.
//   • alertas  → as manchetes mais novas viram Alert (tipo "falaram_de_mim"),
//     com tempo de DESCOBERTA (igual ao gdelt) para casar na janela do delta SSE.
//
// Regras de ouro (idênticas ao lib/sources/gdelt.ts):
//   • getters SÍNCRONOS, nunca lançam — o tick do SSE só lê cache.
//   • busca assíncrona fora de banda (ensureFreshNews), TTL + guarda "em voo".
//   • falhou? mantém o último bom; sem nenhum, devolve null/[] → live-mock cai
//     no sintético. Nunca quebra.
//   • último índice persistido em data/ para warm-start após restart/deploy.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { XMLParser } from "fast-xml-parser";

import type { Alert } from "@/lib/live-schemas";

const TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
const CACHE_FILE = join(process.cwd(), "data", "google-news-cache.json");
const IDX_MIN = 40;
const IDX_MAX = 220;
const MAX_ALERTAS = 50;
const DIA_MS = 24 * 60 * 60 * 1000;

type Cache = { at: number; value: number | null };

let imprensa: Cache = { at: 0, value: null };
let alertas: Alert[] = []; // rolling, mais novo primeiro
const guidsVistos = new Set<string>();
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (typeof raw.imprensa === "number" && Number.isFinite(raw.imprensa)) {
      imprensa = { at: 0, value: raw.imprensa }; // at=0 força refresh no 1º tick
    }
  } catch {
    /* primeira execução */
  }
})();

// ── getters síncronos ────────────────────────────────────────────────────────

/** Índice de imprensa real (~100) do volume de notícias. null = sem sinal. */
export function getNewsImprensa(): number | null {
  return imprensa.value;
}

/** Manchetes reais com tempo de DESCOBERTA em (from, to]. */
export function newsAlertasBetween(from: number, to: number): Alert[] {
  return alertas.filter((a) => a.t > from && a.t <= to).sort((x, y) => x.t - y.t);
}

/** Backlog de manchetes reais (mais novo primeiro) — para o snapshot inicial. */
export function newsAlertasRecentes(max = 20): Alert[] {
  return alertas.slice(0, max);
}

/** Dispara um refresh se o cache venceu e não há busca em voo. NÃO bloqueia. */
export function ensureFreshNews(termos: string[]): void {
  if (inFlight) return;
  if (Date.now() - imprensa.at < TTL_MS && imprensa.value !== null) return;
  inFlight = true;
  void refresh(termos).finally(() => {
    inFlight = false;
  });
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

async function refresh(termos: string[]): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let xml: string;
    try {
      const res = await fetch(urlFor(termos[0] ?? "Sóstenes Cavalcante"), {
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

    const idx = indiceDeVolume(itens);
    if (idx !== null) {
      imprensa = { at: Date.now(), value: idx };
      persist(idx);
    }
    ingerirAlertas(itens);
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
 * Volume → índice ~100: taxa diária dos últimos 3 dias vs média diária da
 * janela inteira. Suave (não pula a cada matéria) e ancorado em 100 = ritmo
 * normal de cobertura; >100 = candidato em alta na imprensa.
 */
function indiceDeVolume(itens: Item[]): number | null {
  const datas = itens.map((i) => i.t).filter((t) => t > 0);
  if (datas.length < 5) return null;
  const maxT = Math.max(...datas);
  const minT = Math.min(...datas);
  const spanDias = Math.max(1, (maxT - minT) / DIA_MS);
  const baselinePorDia = datas.length / spanDias; // ritmo médio da janela
  if (baselinePorDia <= 0) return null;
  const recentePorDia = datas.filter((t) => maxT - t <= 3 * DIA_MS).length / 3;
  return round1(clamp((recentePorDia / baselinePorDia) * 100, IDX_MIN, IDX_MAX));
}

function ingerirAlertas(itens: Item[]): void {
  const agora = Date.now();
  const novos: Alert[] = [];
  for (const it of itens) {
    if (guidsVistos.has(it.guid)) continue;
    guidsVistos.add(it.guid);
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
  // Só empilha se já tínhamos visto algo antes (1º fetch popula o "seen" sem
  // despejar 100 alertas de uma vez na tela).
  if (novos.length && guidsVistos.size > novos.length) {
    alertas = [...novos, ...alertas].slice(0, MAX_ALERTAS);
  } else if (!alertas.length) {
    // 1º fetch: mostra as 8 mais recentes como backlog, sem alarde de delta.
    alertas = novos.slice(0, 8);
  }
}

function persist(value: number): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ at: Date.now(), imprensa: value })}\n`);
  } catch {
    /* FS read-only */
  }
}

// ── utils ────────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
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
