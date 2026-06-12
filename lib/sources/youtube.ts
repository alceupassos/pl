// Fonte REAL de seguidores — inscritos do canal do YouTube do candidato, via
// yt-dlp (sem chave), exposto pelo sidecar em /youtube. Como é um número
// absoluto, guardamos um snapshot por dia em disco e o índice ~100 reflete o
// CRESCIMENTO (começa em 100, fica vivo conforme os dias passam).
//
// Padrão dos providers: getter síncrono + fallback. Sidecar fora do ar / canal
// sem dado → getSeguidoresReal() = null → live-mock cai no sintético.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
// Canal oficial do Sóstenes Cavalcante (PL-RJ).
const CANAL = "https://www.youtube.com/channel/UCI2j76o7JyLVSmooEcSvLxA";
const TTL_MS = 12 * 60 * 60 * 1000; // inscritos mudam devagar
const FETCH_TIMEOUT_MS = 25_000; // yt-dlp pode demorar alguns segundos
const CACHE_FILE = join(process.cwd(), "data", "youtube-cache.json");
const MAX_HIST = 60;

type Snapshot = { dia: string; subs: number };
type State = { at: number; atual: number | null; nome: string | null; hist: Snapshot[] };

let state: State = { at: 0, atual: null, nome: null, hist: [] };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && Array.isArray(raw.hist)) state = { at: 0, ...raw };
  } catch {
    /* primeira execução */
  }
})();

/** Índice de seguidores (~100; reflete crescimento). null = sem dado → sintético. */
export function getSeguidoresReal(): number | null {
  if (state.atual === null || !state.hist.length) return null;
  const antigo = state.hist[0].subs;
  if (antigo <= 0) return 100;
  const cresc = ((state.atual - antigo) / antigo) * 100; // % na janela
  return Math.round(clamp(100 + cresc * 5, 40, 220) * 10) / 10;
}

/** Contagem real de inscritos (para tooltip/diagnóstico). */
export function getSeguidoresCount(): number | null {
  return state.atual;
}

/** Dispara o refresh (via sidecar/yt-dlp) se venceu. Não bloqueia. */
export function ensureFreshYoutube(): void {
  if (inFlight) return;
  if (Date.now() - state.at < TTL_MS && state.atual !== null) return;
  inFlight = true;
  void refresh().finally(() => {
    inFlight = false;
  });
}

async function refresh(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let subs: number | null = null;
    let nome: string | null = null;
    try {
      const url = `${SIDECAR_BASE}/youtube?channel=${encodeURIComponent(CANAL)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { subscribers?: number | null; nome?: string | null };
      if (typeof json.subscribers === "number" && Number.isFinite(json.subscribers)) {
        subs = json.subscribers;
        nome = json.nome ?? null;
      }
    } finally {
      clearTimeout(timer);
    }
    if (subs === null) return;

    const dia = new Date().toISOString().slice(0, 10);
    const hist = state.hist.filter((s) => s.dia !== dia); // 1 snapshot por dia
    hist.push({ dia, subs });
    state = { at: Date.now(), atual: subs, nome, hist: hist.slice(-MAX_HIST) };
    persist();
  } catch {
    /* sidecar/rede indisponível — mantém o último bom */
  }
}

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ atual: state.atual, nome: state.nome, hist: state.hist })}\n`);
  } catch {
    /* FS read-only */
  }
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* ── vídeos recentes (aba Redes) ── */

export type VideoReal = {
  id: string;
  titulo: string;
  views: number;
  comentarios: number;
  likes: number;
  data: string;
  engajamento: number;
};

const VIDEOS_TTL_MS = 6 * 60 * 60 * 1000;
const VIDEOS_CACHE_FILE = join(process.cwd(), "data", "youtube-videos-cache.json");

let videosState: { at: number; videos: VideoReal[] } = { at: 0, videos: [] };
let videosInFlight = false;

(function loadVideosDisk() {
  try {
    const raw = JSON.parse(readFileSync(VIDEOS_CACHE_FILE, "utf8"));
    if (raw && Array.isArray(raw.videos)) videosState = { at: 0, videos: raw.videos };
  } catch {
    /* primeira execução */
  }
})();

/** Últimos vídeos reais do canal. null = sem dado → sintético. */
export function getVideosReal(): VideoReal[] | null {
  return videosState.videos.length ? videosState.videos : null;
}

/** Dispara refresh dos vídeos (yt-dlp --dump-json via sidecar). */
export function ensureFreshYoutubeVideos(): void {
  if (videosInFlight) return;
  if (Date.now() - videosState.at < VIDEOS_TTL_MS && videosState.videos.length > 0) return;
  videosInFlight = true;
  void refreshVideos().finally(() => {
    videosInFlight = false;
  });
}

async function refreshVideos(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45_000);
    try {
      const url = `${SIDECAR_BASE}/youtube/videos?channel=${encodeURIComponent(CANAL)}&n=10`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { videos?: VideoReal[] };
      if (!Array.isArray(json.videos) || !json.videos.length) return;
      videosState = { at: Date.now(), videos: json.videos };
      persistVideos();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar/rede indisponível */
  }
}

function persistVideos(): void {
  try {
    writeFileSync(VIDEOS_CACHE_FILE, `${JSON.stringify({ videos: videosState.videos })}\n`);
  } catch {
    /* FS read-only */
  }
}
