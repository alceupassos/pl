// Fonte REAL e open-source de MENÇÕES / atenção pública — Wikipedia pageviews
// (API REST do Wikimedia, grátis, SEM chave). Substitui o Google Trends como
// fonte de menções: o Trends devolve vazio para nomes menos buscados (os
// concorrentes), enquanto o pageviews funciona por candidato para todos.
//
// Mede o quanto procuram pelo candidato: visitas diárias ao artigo dele na
// Wikipedia → índice ~100 (ritmo recente vs. mediana da janela de 30 dias),
// na mesma escala dos outros ingredientes. Mesmo padrão dos demais sources:
// getter síncrono + ensureFresh* assíncrono com TTL + persistência em disco.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;
const CACHE_FILE = join(process.cwd(), "data", "wikipedia-mentions-cache.json");
const IDX_MIN = 40;
const IDX_MAX = 220;
const UA =
  "cockpit-sostenes/1.0 (https://strategypartners.com.br; contato@strategypartners.com.br)";

type State = { at: number; indice: number | null; titulo: string | null; inFlight: boolean };
const byTermo = new Map<string, State>();

function st(termo: string): State {
  let s = byTermo.get(termo);
  if (!s) {
    s = { at: 0, indice: null, titulo: null, inFlight: false };
    byTermo.set(termo, s);
  }
  return s;
}

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.termos === "object" && raw.termos) {
      for (const [termo, v] of Object.entries(raw.termos)) {
        const o = v as { indice?: number; titulo?: string };
        if (o && typeof o.indice === "number" && Number.isFinite(o.indice)) {
          const s = st(termo);
          s.indice = o.indice;
          s.titulo = typeof o.titulo === "string" ? o.titulo : null;
        }
      }
    }
  } catch {
    /* primeira execução */
  }
})();

function persist(): void {
  try {
    const termos: Record<string, { indice: number; titulo: string | null }> = {};
    for (const [termo, s] of byTermo) {
      if (s.indice !== null) termos[termo] = { indice: s.indice, titulo: s.titulo };
    }
    writeFileSync(CACHE_FILE, `${JSON.stringify({ termos })}\n`);
  } catch {
    /* FS read-only */
  }
}

/** Índice de menções/atenção (~100) do candidato. null = sem dado real ainda. */
export function getWikiMencoesFor(termo: string): number | null {
  return byTermo.get(termo)?.indice ?? null;
}

/** Dispara refresh do termo se o cache venceu e não há busca em voo. Não bloqueia. */
export function ensureFreshWikiMencoesFor(termo: string): void {
  if (!termo) return;
  const s = st(termo);
  if (s.inFlight) return;
  if (Date.now() - s.at < TTL_MS && s.indice !== null) return;
  s.inFlight = true;
  void refresh(termo).finally(() => {
    s.inFlight = false;
  });
}

export function ensureFreshWikiMencoesAll(termos: string[]): void {
  for (const termo of termos) ensureFreshWikiMencoesFor(termo);
}

// ── busca ──────────────────────────────────────────────────────────────────

async function fetchJson(url: string): Promise<unknown | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve o título do artigo na pt.wikipedia pelo nome do candidato.
 * 1) opensearch (prefixo) — rápido; 2) fallback full-text (list=search) para
 * nomes que diferem do título do artigo (ex.: "General Pazuello" → "Eduardo
 * Pazuello", "Doutor Luizinho" etc.). */
async function resolveTitulo(nome: string): Promise<string | null> {
  const opensearch = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
    nome,
  )}&limit=1&namespace=0&format=json`;
  const j1 = await fetchJson(opensearch);
  // formato: [busca, [titulos], [descricoes], [urls]]
  if (Array.isArray(j1) && Array.isArray(j1[1]) && typeof j1[1][0] === "string") {
    return j1[1][0] as string;
  }

  const search = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    nome,
  )}&srlimit=1&srnamespace=0&format=json`;
  const j2 = (await fetchJson(search)) as
    | { query?: { search?: { title?: string }[] } }
    | null;
  const titulo = j2?.query?.search?.[0]?.title;
  return typeof titulo === "string" ? titulo : null;
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

async function refresh(termo: string): Promise<void> {
  const s = st(termo);
  let titulo = s.titulo;
  if (!titulo) {
    titulo = await resolveTitulo(termo);
    if (!titulo) return; // sem artigo → menções indisponível
    s.titulo = titulo;
  }

  const fim = new Date();
  const ini = new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000);
  const article = encodeURIComponent(titulo.replace(/ /g, "_"));
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/pt.wikipedia/all-access/all-agents/${article}/daily/${ymd(
    ini,
  )}/${ymd(fim)}`;

  const json = await fetchJson(url);
  const items = (json as { items?: { views?: number }[] } | null)?.items;
  if (!Array.isArray(items) || items.length < 5) return;

  const views = items
    .map((i) => (typeof i.views === "number" ? i.views : 0))
    .filter((v) => v >= 0);
  if (views.length < 5) return;

  const baseline = views.reduce((a, b) => a + b, 0) / views.length;
  if (baseline <= 0) return;
  const recente = views.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, views.length);
  const indice = Math.round(Math.min(IDX_MAX, Math.max(IDX_MIN, (recente / baseline) * 100)) * 10) / 10;

  s.at = Date.now();
  s.indice = indice;
  persist();
}
