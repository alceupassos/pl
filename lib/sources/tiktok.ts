// Seguidores e vídeos reais do TikTok — yt-dlp via sidecar (sem chave).
// Sem dado → fallback modelado no live-mock-v2.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 12 * 60 * 60 * 1000;
const VIDEOS_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 35_000;
const VIDEOS_TIMEOUT_MS = 50_000;
const CACHE_FILE = join(process.cwd(), "data", "tiktok-cache.json");
const VIDEOS_CACHE_FILE = join(process.cwd(), "data", "tiktok-videos-cache.json");

type Profile = { followers: number; username: string };
type State = { at: number; profiles: Record<string, Profile> };

export type TiktokVideoReal = {
  id: string;
  titulo: string;
  views: number;
  comentarios: number;
  likes: number;
  data: string;
  engajamento: number;
};

let state: State = { at: 0, profiles: {} };
let inFlight = false;
let lastHandles: string[] = [];
let lastPrincipalHandle = "";

let videosState: { at: number; videos: TiktokVideoReal[] } = { at: 0, videos: [] };
let videosInFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.profiles === "object") {
      state = { at: 0, profiles: raw.profiles };
    }
  } catch {
    /* primeira execução */
  }
})();

(function loadVideosDisk() {
  try {
    const raw = JSON.parse(readFileSync(VIDEOS_CACHE_FILE, "utf8"));
    if (raw && Array.isArray(raw.videos)) {
      videosState = { at: 0, videos: raw.videos };
    }
  } catch {
    /* primeira execução */
  }
})();

function norm(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

/** Seguidores reais de um handle TikTok. null = sem dado → sintético. */
export function getTiktokFollowers(handle: string | undefined | null): number | null {
  if (!handle) return null;
  const p = state.profiles[norm(handle)];
  return p?.followers ?? null;
}

/** Últimos vídeos reais do perfil principal. null = sem dado. */
export function getTiktokVideos(): TiktokVideoReal[] | null {
  return videosState.videos.length ? videosState.videos : null;
}

/** Dispara refresh em lote de perfis + vídeos do principal. */
export function ensureFreshTiktok(handles: string[], principalHandle?: string): void {
  const unique = [...new Set(handles.map(norm).filter(Boolean))];
  if (!unique.length) return;
  lastHandles = unique;
  if (principalHandle) lastPrincipalHandle = norm(principalHandle);

  if (!inFlight) {
    if (Date.now() - state.at >= TTL_MS || !unique.every((h) => state.profiles[h]?.followers != null)) {
      inFlight = true;
      void refreshProfiles(unique).finally(() => {
        inFlight = false;
      });
    }
  }

  const ph = lastPrincipalHandle || unique[0];
  if (!ph) return;
  if (videosInFlight) return;
  if (Date.now() - videosState.at < VIDEOS_TTL_MS && videosState.videos.length > 0) return;
  videosInFlight = true;
  void refreshVideos(ph).finally(() => {
    videosInFlight = false;
  });
}

async function refreshProfiles(handles: string[]): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}/tiktok/profiles?handles=${encodeURIComponent(handles.join(","))}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as {
        profiles?: Record<string, { followers?: number | null; username?: string }>;
      };
      const profiles: Record<string, Profile> = { ...state.profiles };
      for (const [key, val] of Object.entries(json.profiles ?? {})) {
        const h = norm(key);
        if (typeof val.followers === "number" && Number.isFinite(val.followers)) {
          profiles[h] = { followers: val.followers, username: val.username ?? h };
        }
      }
      if (Object.keys(profiles).length) {
        state = { at: Date.now(), profiles };
        persist();
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível */
  }
}

async function refreshVideos(handle: string): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), VIDEOS_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}/tiktok/videos?handle=${encodeURIComponent(handle)}&n=10`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { videos?: TiktokVideoReal[] };
      if (!Array.isArray(json.videos) || !json.videos.length) return;
      videosState = { at: Date.now(), videos: json.videos };
      persistVideos();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível */
  }
}

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ profiles: state.profiles })}\n`);
  } catch {
    /* FS read-only */
  }
}

function persistVideos(): void {
  try {
    writeFileSync(VIDEOS_CACHE_FILE, `${JSON.stringify({ videos: videosState.videos })}\n`);
  } catch {
    /* FS read-only */
  }
}

export function ensureFreshTiktokCached(): void {
  if (lastHandles.length) {
    ensureFreshTiktok(lastHandles, lastPrincipalHandle || lastHandles[0]);
  }
}
