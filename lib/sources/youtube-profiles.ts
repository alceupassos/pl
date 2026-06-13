// Inscritos reais de YouTube por canal (multi-candidato) para a comparação da aba
// Redes. Diferente de lib/sources/youtube.ts (single-channel do principal, que
// alimenta o SOST-IDX): aqui o cache é keyed pela URL EXATA do canal — IDs
// /channel/UC... são case-sensitive, então NÃO dá para reusar o social-cache
// (que faz lowercase + strip @ e corromperia o ID).
//
// Padrão dos providers: getter síncrono lido pelo tick + ensureFresh fora de banda.
// Sidecar fora do ar / canal sem dado → getYoutubeFollowers() = null → sintético.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 12 * 60 * 60 * 1000; // inscritos mudam devagar
const FETCH_TIMEOUT_MS = 45_000; // yt-dlp pode demorar alguns segundos por canal
const CACHE_FILE = join(process.cwd(), "data", "youtube-profiles-cache.json");

type Entry = { subs: number; nome: string | null; at: number };
type Store = Record<string, Entry>;

let store: Store = {};
const inFlight = new Set<string>();

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw === "object") store = raw as Store;
  } catch {
    /* primeira execução */
  }
})();

function persist(): void {
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    writeFileSync(CACHE_FILE, `${JSON.stringify(store)}\n`);
  } catch {
    /* FS read-only */
  }
}

/** Inscritos reais do canal (por URL exata). null = sem dado → sintético. */
export function getYoutubeFollowers(url: string | null | undefined): number | null {
  if (!url) return null;
  const e = store[url];
  return e && Number.isFinite(e.subs) ? e.subs : null;
}

/** Dispara o refresh dos canais vencidos (via sidecar/yt-dlp). Não bloqueia. */
export function ensureFreshYoutubeProfiles(urls: (string | null | undefined)[]): void {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  for (const url of unique) {
    const e = store[url];
    if (e && Date.now() - e.at < TTL_MS) continue;
    if (inFlight.has(url)) continue;
    inFlight.add(url);
    void refreshOne(url).finally(() => inFlight.delete(url));
  }
}

async function refreshOne(url: string): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const reqUrl = `${SIDECAR_BASE}/youtube/profiles?channels=${encodeURIComponent(url)}`;
      const res = await fetch(reqUrl, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as {
        profiles?: Record<string, { subscribers?: number | null; nome?: string | null }>;
      };
      const prof = json.profiles?.[url];
      if (!prof || typeof prof.subscribers !== "number" || !Number.isFinite(prof.subscribers)) {
        return;
      }
      store[url] = { subs: prof.subscribers, nome: prof.nome ?? null, at: Date.now() };
      persist();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar/rede indisponível — mantém o último bom */
  }
}
