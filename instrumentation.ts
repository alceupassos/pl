// Pré-aquecimento no boot do servidor (Next 16 roda register() no start).
// Mantém as fontes reais do índice preenchidas mesmo sem ninguém abrir o /m:
// um warm loop a cada 60s dispara as buscas (todas respeitam TTL/fila — barato).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Rede de segurança: as fontes reais (sidecar pysentimiento na :8088, Google
  // News, Wikipédia, redes sociais) são disparadas fire-and-forget pelo SSE
  // (app/api/stream) e pelo warm loop abaixo. Quando o sidecar tem um soluço
  // (ECONNREFUSED/ECONNRESET) uma dessas promises rejeita sem dono → o Node
  // mata o processo (unhandledRejection) → PM2 reinicia em loop → 502 no
  // Cloudflare. Um fetch de fonte NUNCA deve derrubar o servidor web: logamos
  // e seguimos no fallback (mesma filosofia de "app não quebra" das fontes).
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection] suprimido (fonte/sidecar não derruba o servidor):", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException] suprimido:", err);
  });

  const [{ readWatchlist }, { warmIndexSources }] = await Promise.all([
    import("@/lib/watchlist"),
    import("@/lib/warm-index"),
  ]);

  const tick = async () => {
    try {
      warmIndexSources(await readWatchlist());
    } catch {
      /* boot sem watchlist / FS — tenta no próximo tick */
    }
  };

  void tick();
  setInterval(() => void tick(), 60_000);
}
