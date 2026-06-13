// Seguidores reais no X — Bright Data / Kondado / cookies via sidecar + cache.

import { ensureFreshProfiles, getFollowersFromCache } from "@/lib/sources/social-fetch";

let lastHandles: string[] = [];

export function getXFollowers(handle: string | undefined | null): number | null {
  return getFollowersFromCache("x", handle ?? "");
}

export function ensureFreshX(handles: string[]): void {
  lastHandles = handles;
  ensureFreshProfiles("x", handles, "/x/profiles");
}

export function ensureFreshXCached(): void {
  if (lastHandles.length) ensureFreshX(lastHandles);
}
