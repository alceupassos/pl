// Seguidores reais do Instagram — Bright Data / Kondado / Meta via sidecar + cache Postgres.

import { ensureFreshProfiles, getFollowersFromCache } from "@/lib/sources/social-fetch";

export function getInstagramFollowers(handle: string | undefined | null): number | null {
  return getFollowersFromCache("instagram", handle ?? "");
}

export function ensureFreshInstagram(handles: string[]): void {
  ensureFreshProfiles("instagram", handles, "/instagram/profiles");
}

export function ensureFreshInstagramCached(handles?: string[]): void {
  if (handles?.length) ensureFreshInstagram(handles);
}
