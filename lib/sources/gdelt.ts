// Fonte REAL de imprensa para o índice SOST — GDELT DOC 2.0 (grátis, sem chave).
// https://api.gdeltproject.org/api/v2/doc/doc — modo timelinevol devolve a
// "intensidade de volume" (fração da cobertura global) do termo ao longo do
// tempo. Convertemos isso num índice ~100 (100 = cobertura típica da janela;
// >100 = candidato em alta na imprensa) que entra no breakdown.imprensa.
//
// Regras de ouro deste módulo:
//  • getImprensaIndex() é SÍNCRONO e nunca lança — o tick do SSE lê o cache.
//  • a busca é assíncrona, fora de banda (ensureFreshImprensa), com TTL e
//    guarda de "em voo" — respeita o limite de 1 req/5s do GDELT de sobra.
//  • falhou (throttle 429, rede, JSON inválido)? mantém o último bom; se nunca
//    houve um, getImprensaIndex() devolve null e o live-mock cai no sintético.
//  • o último valor bom é persistido em data/ para warm-start após restart.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TTL_MS = 15 * 60 * 1000; // 15 min — muito acima da etiqueta do GDELT
const FETCH_TIMEOUT_MS = 20_000;
const CACHE_FILE = join(process.cwd(), "data", "gdelt-imprensa.json");

// Faixa sã do índice — protege o headline de spikes/zeros bizarros do GDELT.
const IDX_MIN = 40;
const IDX_MAX = 220;

type Cache = { at: number; value: number | null };

// Warm-start: tenta reidratar o último valor bom do disco (após deploy/restart).
function loadDisk(): Cache {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (typeof raw.value === "number" && Number.isFinite(raw.value)) {
      return { at: 0, value: raw.value }; // at=0 força um refresh já no 1º tick
    }
  } catch {
    /* sem cache em disco — primeira execução */
  }
  return { at: 0, value: null };
}

let cache: Cache = loadDisk();
let inFlight = false;

/** Índice de imprensa real (~100). null = sem sinal ainda → usar o sintético. */
export function getImprensaIndex(): number | null {
  return cache.value;
}

/** True se temos um valor real recente (para marcar a fonte na UI/diagnóstico). */
export function imprensaIsLive(): boolean {
  return cache.value !== null && Date.now() - cache.at < TTL_MS;
}

/**
 * Dispara um refresh se o cache venceu e não há busca em voo. NÃO bloqueia:
 * pode ser chamado de dentro do loop de 1s do SSE à vontade — só dispara de
 * fato a cada TTL, e várias conexões compartilham a mesma busca.
 */
export function ensureFreshImprensa(termos: string[]): void {
  if (inFlight) return;
  if (Date.now() - cache.at < TTL_MS && cache.value !== null) return;
  inFlight = true;
  void refresh(termos).finally(() => {
    inFlight = false;
  });
}

// Monta a query GDELT a partir dos termos da watchlist (1º termo é o principal).
function buildUrl(termos: string[]): string {
  const termo = termos[0] ?? "Sóstenes Cavalcante";
  const query = `"${termo}"`; // aspas = frase exata
  const params = new URLSearchParams({
    query,
    mode: "timelinevol",
    timespan: "1week",
    format: "json",
  });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}`;
}

async function refresh(termos: string[]): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let body: string;
    try {
      const res = await fetch(buildUrl(termos), {
        signal: ctrl.signal,
        headers: { "User-Agent": "sostenes-cockpit/1.0 (campaign monitor)" },
      });
      body = await res.text();
      if (!res.ok) return; // 429/5xx → mantém o último bom
    } finally {
      clearTimeout(timer);
    }
    const idx = parseImprensaIndex(body);
    if (idx === null) return; // throttle text / JSON vazio → mantém o último bom
    cache = { at: Date.now(), value: idx };
    persist(idx);
  } catch {
    /* rede caiu / abort — mantém o último valor bom em cache */
  }
}

/**
 * Converte o JSON do timelinevol num índice ~100. Exportada para o script de
 * teste (scripts/test-gdelt.mjs) exercitar o parser com payload real.
 */
export function parseImprensaIndex(body: string): number | null {
  // O GDELT responde o throttle em texto puro ("Please limit requests…").
  const trimmed = body.trimStart();
  if (!trimmed.startsWith("{")) return null;

  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const timeline = (json as { timeline?: { data?: { value?: number }[] }[] }).timeline;
  const data = timeline?.[0]?.data;
  if (!Array.isArray(data) || data.length < 3) return null;

  const valores = data
    .map((d) => d.value)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (valores.length < 3) return null;

  // "Hoje" = média dos 2 pontos mais recentes; baseline = mediana da janela
  // (robusta a picos). Índice = quanto a cobertura atual está acima/abaixo do
  // normal da semana, ancorado em 100.
  const recente = (valores[valores.length - 1] + valores[valores.length - 2]) / 2;
  const baseline = mediana(valores) || media(valores);
  if (baseline <= 0) return null;

  const idx = (recente / baseline) * 100;
  return round1(clamp(idx, IDX_MIN, IDX_MAX));
}

function persist(value: number): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ at: Date.now(), value })}\n`);
  } catch {
    /* FS read-only — segue só com o cache em memória */
  }
}

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
