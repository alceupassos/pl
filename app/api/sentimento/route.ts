import { NextResponse } from "next/server";

import { getSentimentoRealFor } from "@/lib/sources/sentiment";
import { readWatchlist } from "@/lib/watchlist";

// Sentimento atual do candidato principal, em %: net = (menções pos − neg) ÷ total
// = índice − 100 (o índice ~100 vem do sidecar/léxico, cacheado por candidato).
// Leitura síncrona do cache em memória — sem efeitos colaterais.
export async function GET() {
  const w = await readWatchlist();
  const indice = getSentimentoRealFor(w.principal.nome);
  const net = indice == null ? null : Math.round(indice - 100);
  return NextResponse.json(
    { net, indice, real: indice != null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
