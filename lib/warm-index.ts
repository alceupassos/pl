// Pré-aquecimento das fontes reais do índice (lib/index-real.ts), por candidato.
// Reutilizado pelo boot (instrumentation.ts) e pela página /basecalculo, para
// que os campos preencham sozinhos — sem depender de alguém abrir o /m.
//
// Foca nas 3 fontes de TEXTO do índice (imprensa, sentimento, menções). NÃO
// dispara os coletores de seguidores aqui de propósito: o yt-dlp (youtube-
// profiles) entra em loop de erro de bot e satura o sidecar único, matando de
// fome o /sentiment. Seguidores já vêm reais do cache (BrightData, janela de
// reuso de ~1 semana) e são atualizados quando alguém abre o /m (stream route).
// Todas as funções respeitam TTL/fila, então chamar com frequência é barato.
// Server-only.

import { ensureFreshNewsAll } from "@/lib/sources/google-news";
import { ensureFreshSentimentoAll } from "@/lib/sources/sentiment";
import { ensureFreshWikiMencoesAll } from "@/lib/sources/wikipedia-mentions";
import type { Watchlist } from "@/lib/watchlist";

export function warmIndexSources(w: Watchlist): void {
  const termos = [w.principal.nome, ...w.concorrentes_rj.map((c) => c.nome)];
  ensureFreshNewsAll(termos); // imprensa + manchetes por candidato (Node, sem sidecar)
  ensureFreshSentimentoAll(termos); // sentimento por candidato (sidecar pysentimiento)
  ensureFreshWikiMencoesAll(termos); // menções por candidato (Wikipedia pageviews, Node)
}
