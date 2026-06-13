// Fetch de perfis sociais via sidecar + cache persistente (Postgres/JSON).

import {
  getCachedProfile,
  getCachedProfileSync,
  isFresh,
  isUsableStale,
  setCachedProfile,
  type CachedProfile,
  type SocialNetwork,
} from "@/lib/sources/social-cache";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const FETCH_TIMEOUT_MS = 55_000;

type SidecarProfile = {
  followers?: number | null;
  username?: string | null;
  nome?: string | null;
  source?: string | null;
};

const inFlight = new Map<string, Promise<void>>();

function norm(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export function getFollowersFromCache(network: SocialNetwork, handle: string | null | undefined): number | null {
  if (!handle) return null;
  const cached = getCachedProfileSync(network, handle);
  if (isFresh(cached) || isUsableStale(cached)) return cached!.followers;
  return null;
}

export function getProfileMeta(network: SocialNetwork, handle: string): CachedProfile | null {
  const cached = getCachedProfileSync(network, handle);
  if (isFresh(cached) || isUsableStale(cached)) return cached;
  return null;
}

export function ensureFreshProfiles(
  network: SocialNetwork,
  handles: string[],
  profilesPath: string,
): void {
  const unique = [...new Set(handles.map(norm).filter(Boolean))];
  if (!unique.length) return;

  const stale = unique.filter((h) => {
    const c = getCachedProfileSync(network, h);
    return !isFresh(c);
  });
  if (!stale.length) return;

  const flightKey = `${network}:${stale.sort().join(",")}`;
  if (inFlight.has(flightKey)) return;

  const job = refreshBatch(network, stale, profilesPath).finally(() => {
    inFlight.delete(flightKey);
  });
  inFlight.set(flightKey, job);
}

async function refreshBatch(
  network: SocialNetwork,
  handles: string[],
  profilesPath: string,
): Promise<void> {
  for (const h of handles) {
    const cached = await getCachedProfile(network, h);
    if (isFresh(cached)) continue;
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}${profilesPath}?handles=${encodeURIComponent(handles.join(","))}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { profiles?: Record<string, SidecarProfile> };
      for (const [rawKey, val] of Object.entries(json.profiles ?? {})) {
        const h = norm(rawKey);
        if (typeof val.followers !== "number" || !Number.isFinite(val.followers)) continue;
        await setCachedProfile({
          network,
          handle: h,
          followers: val.followers,
          username: val.username ?? h,
          displayName: val.nome ?? null,
          source: val.source ?? network,
          raw: val,
        });
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível — mantém stale */
  }
}

export async function refreshSingleProfile(
  network: SocialNetwork,
  handle: string,
  singlePath: string,
): Promise<void> {
  const h = norm(handle);
  if (!h) return;
  const cached = await getCachedProfile(network, h);
  if (isFresh(cached)) return;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const url = `${SIDECAR_BASE}${singlePath}?handle=${encodeURIComponent(h)}`;
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return;
      const val = (await res.json()) as SidecarProfile;
      if (typeof val.followers !== "number" || !Number.isFinite(val.followers)) return;
      await setCachedProfile({
        network,
        handle: h,
        followers: val.followers,
        username: val.username ?? h,
        displayName: val.nome ?? null,
        source: val.source ?? network,
        raw: val,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível */
  }
}
