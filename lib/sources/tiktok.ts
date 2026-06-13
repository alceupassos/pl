// Seguidores e vídeos reais do TikTok — Bright Data / Kondado / yt-dlp via sidecar + cache.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ensureFreshProfiles, getFollowersFromCache } from "@/lib/sources/social-fetch";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const VIDEOS_TTL_MS = 6 * 60 * 60 * 1000;
const VIDEOS_TIMEOUT_MS = 50_000;
const VIDEOS_CACHE_FILE = join(process.cwd(), "data", "tiktok-videos-cache.json");

export type TiktokVideoReal = {
  id: string;
  titulo: string;
  views: number;
  comentarios: number;
  likes: number;
  data: string;
  engajamento: number;
};

let videosState: { at: number; videos: TiktokVideoReal[] } = { at: 0, videos: [] };
let videosInFlight = false;
let lastHandles: string[] = [];
let lastPrincipalHandle = "";

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

export function getTiktokFollowers(handle: string | undefined | null): number | null {
  return getFollowersFromCache("tiktok", handle ?? "");
}

export function getTiktokVideos(): TiktokVideoReal[] | null {
  return videosState.videos.length ? videosState.videos : null;
}

export function ensureFreshTiktok(handles: string[], principalHandle?: string): void {
  const unique = [...new Set(handles.map(norm).filter(Boolean))];
  if (!unique.length) return;
  lastHandles = unique;
  if (principalHandle) lastPrincipalHandle = norm(principalHandle);
  ensureFreshProfiles("tiktok", unique, "/tiktok/profiles");

  const ph = lastPrincipalHandle || unique[0];
  if (!ph || videosInFlight) return;
  if (Date.now() - videosState.at < VIDEOS_TTL_MS && videosState.videos.length > 0) return;
  videosInFlight = true;
  void refreshVideos(ph).finally(() => {
    videosInFlight = false;
  });
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
