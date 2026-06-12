// Seguidores reais do Instagram — Graph API (business_discovery) via sidecar.
// META_ACCESS_TOKEN + META_IG_USER_ID no env do sidecar. Sem token → sintético.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 30_000;
const CACHE_FILE = join(process.cwd(), "data", "instagram-cache.json");

type Profile = { followers: number; username: string };
type State = { at: number; profiles: Record<string, Profile> };

let state: State = { at: 0, profiles: {} };
let inFlight = false;
let lastHandles: string[] = [];

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

function norm(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

/** Seguidores reais de um handle IG. null = sem dado → sintético. */
export function getInstagramFollowers(handle: string | undefined | null): number | null {
  if (!handle) return null;
  const p = state.profiles[norm(handle)];
  return p?.followers ?? null;
}

/** Dispara refresh em lote se venceu TTL. */
export function ensureFreshInstagram(handles: string[]): void {
  const unique = [...new Set(handles.map(norm).filter(Boolean))];
  if (!unique.length) return;
  lastHandles = unique;
  if (inFlight) return;
  if (Date.now() - state.at < TTL_MS && unique.every((h) => state.profiles[h]?.followers != null)) {
    return;
  }
  inFlight = true;
  void refresh(unique).finally(() => {
    inFlight = false;
  });
}

async function refresh(handles: string[]): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}/instagram/profiles?handles=${encodeURIComponent(handles.join(","))}`;
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

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ profiles: state.profiles })}\n`);
  } catch {
    /* FS read-only */
  }
}

/** Re-dispara refresh com os últimos handles conhecidos (tick SSE). */
export function ensureFreshInstagramCached(): void {
  if (lastHandles.length) ensureFreshInstagram(lastHandles);
}
