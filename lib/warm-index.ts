// Pré-aquecimento das fontes reais do índice (lib/index-real.ts), por candidato.
// Reutilizado pelo boot (instrumentation.ts) e pela página /basecalculo, para
// que os campos (imprensa, sentimento, menções, seguidores) preencham sozinhos —
// sem depender de alguém abrir o /m. Todas as funções respeitam TTL/fila, então
// chamar com frequência é barato e idempotente. Server-only.

import { ensureFreshFacebook } from "@/lib/sources/facebook";
import { ensureFreshNewsAll } from "@/lib/sources/google-news";
import { ensureFreshInstagram } from "@/lib/sources/instagram";
import { ensureFreshLinkedin } from "@/lib/sources/linkedin";
import { ensureFreshSentimentoAll } from "@/lib/sources/sentiment";
import {
  facebookHandlesFromWatchlist,
  instagramHandlesFromWatchlist,
  linkedinHandlesFromWatchlist,
  principalTiktokHandle,
  tiktokHandlesFromWatchlist,
  xHandlesFromWatchlist,
  youtubeChannelsFromWatchlist,
} from "@/lib/sources/social-handles";
import { ensureFreshTiktok } from "@/lib/sources/tiktok";
import { ensureFreshTrendsAll } from "@/lib/sources/trends";
import { ensureFreshX } from "@/lib/sources/x";
import { ensureFreshYoutubeProfiles } from "@/lib/sources/youtube-profiles";
import type { Watchlist } from "@/lib/watchlist";

export function warmIndexSources(w: Watchlist): void {
  const termos = [w.principal.nome, ...w.concorrentes_rj.map((c) => c.nome)];
  ensureFreshNewsAll(termos); // imprensa + manchetes por candidato
  ensureFreshSentimentoAll(termos); // sentimento por candidato (nas manchetes)
  ensureFreshTrendsAll(termos); // menções por candidato (fila espaçada)
  ensureFreshYoutubeProfiles(youtubeChannelsFromWatchlist(w));
  ensureFreshInstagram(instagramHandlesFromWatchlist(w));
  ensureFreshFacebook(facebookHandlesFromWatchlist(w));
  ensureFreshX(xHandlesFromWatchlist(w));
  ensureFreshTiktok(tiktokHandlesFromWatchlist(w), principalTiktokHandle(w));
  ensureFreshLinkedin(linkedinHandlesFromWatchlist(w));
}
