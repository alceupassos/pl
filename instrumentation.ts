// Pré-aquecimento no boot do servidor (Next 16 roda register() no start).
// Mantém as fontes reais do índice preenchidas mesmo sem ninguém abrir o /m:
// um warm loop a cada 60s dispara as buscas (todas respeitam TTL/fila — barato).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

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
