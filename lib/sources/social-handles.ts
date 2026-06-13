// Extrai handles de redes da watchlist para refresh em lote (IG / X).

import type { Watchlist } from "@/lib/watchlist";

export function instagramHandlesFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.instagram) out.push(w.principal.handles.instagram);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.instagram) out.push(c.handles.instagram);
  }
  return out;
}

export function xHandlesFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.x) out.push(w.principal.handles.x);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.x) out.push(c.handles.x);
  }
  return out;
}

export function tiktokHandlesFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.tiktok) out.push(w.principal.handles.tiktok);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.tiktok) out.push(c.handles.tiktok);
  }
  return out;
}

export function principalTiktokHandle(w: Watchlist): string | undefined {
  return w.principal.handles?.tiktok;
}

export function linkedinHandlesFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.linkedin) out.push(w.principal.handles.linkedin);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.linkedin) out.push(c.handles.linkedin);
  }
  return out;
}

export function facebookHandlesFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.facebook) out.push(w.principal.handles.facebook);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.facebook) out.push(c.handles.facebook);
  }
  return out;
}

// URLs de canal do YouTube (principal + concorrentes RJ). Mantém a URL EXATA — o
// /channel/UC... é case-sensitive (ver lib/sources/youtube-profiles.ts).
export function youtubeChannelsFromWatchlist(w: Watchlist): string[] {
  const out: string[] = [];
  if (w.principal.handles?.youtube) out.push(w.principal.handles.youtube);
  for (const c of w.concorrentes_rj) {
    if (c.handles?.youtube) out.push(c.handles.youtube);
  }
  return out;
}
