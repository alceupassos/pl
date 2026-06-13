// Seguidores reais da página Facebook — Bright Data / Kondado / Meta via sidecar + cache.

import { getFollowersFromCache } from "@/lib/sources/social-fetch";
import { setCachedProfile } from "@/lib/sources/social-cache";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const PRINCIPAL_HANDLE = "sostenescavalcante";
let inFlight = false;

export function getFacebookFollowers(): number | null {
  return getFollowersFromCache("facebook", PRINCIPAL_HANDLE);
}

export function getFacebookFollowersByHandle(handle: string | undefined | null): number | null {
  if (!handle) return null;
  return getFollowersFromCache("facebook", handle);
}

export function ensureFreshFacebook(handles?: string[]): void {
  if (inFlight) return;
  inFlight = true;
  void (async () => {
    try {
      if (handles?.length) {
        const { ensureFreshProfiles } = await import("@/lib/sources/social-fetch");
        ensureFreshProfiles("facebook", handles, "/facebook/profiles");
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30_000);
      try {
        const res = await fetch(`${SIDECAR_BASE}/facebook`, { signal: ctrl.signal });
        if (res.ok) {
          const json = (await res.json()) as {
            followers?: number | null;
            nome?: string | null;
            source?: string | null;
          };
          if (typeof json.followers === "number" && Number.isFinite(json.followers)) {
            await setCachedProfile({
              network: "facebook",
              handle: PRINCIPAL_HANDLE,
              followers: json.followers,
              displayName: json.nome ?? null,
              source: json.source ?? "meta",
            });
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } finally {
      inFlight = false;
    }
  })();
}
