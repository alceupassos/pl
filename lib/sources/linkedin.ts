// Seguidores reais do LinkedIn — Bright Data / Kondado via sidecar + cache.

import { ensureFreshProfiles, getFollowersFromCache } from "@/lib/sources/social-fetch";

let lastHandles: string[] = [];

export function getLinkedinFollowers(handle: string | undefined | null): number | null {
  return getFollowersFromCache("linkedin", handle ?? "");
}

export function ensureFreshLinkedin(handles: string[]): void {
  lastHandles = handles;
  ensureFreshProfiles("linkedin", handles, "/linkedin/profiles");
}

export function ensureFreshLinkedinCached(): void {
  if (lastHandles.length) ensureFreshLinkedin(lastHandles);
}
