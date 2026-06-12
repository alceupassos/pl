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
