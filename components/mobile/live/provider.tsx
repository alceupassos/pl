"use client";

// A ÚNICA conexão SSE do /m. Mantém o LiveStore alimentado e expõe a
// referência (estável) do store via context — assinaturas finas ficam nos
// hooks de use-live.ts.

import { createContext, useContext, useEffect, useState } from "react";

import { LiveStore } from "@/components/mobile/live/store";

const LiveContext = createContext<LiveStore | null>(null);

export function useLiveStore(): LiveStore {
  const store = useContext(LiveContext);
  if (!store) throw new Error("useLiveStore precisa de <LiveDataProvider>");
  return store;
}

export function LiveDataProvider({ children }: { children: React.ReactNode }) {
  // Lazy state (não ref): a referência é estável a vida toda do provider.
  const [store] = useState(() => new LiveStore());

  useEffect(() => {
    let disposed = false;
    let errorCount = 0;
    let checking = false;

    // ?demo=votacao é repassado ao stream (força votação ativa p/ demo)
    const demo = new URLSearchParams(window.location.search).get("demo");
    const url = `/api/stream${demo === "votacao" ? "?demo=votacao" : ""}`;
    const source = new EventSource(url);

    source.onopen = () => {
      errorCount = 0;
      store.setStatus("open");
    };

    source.onmessage = (event) => {
      try {
        store.apply(JSON.parse(event.data));
      } catch {
        console.warn("[live] mensagem não-JSON descartada");
      }
    };

    // EventSource reconecta sozinho; aqui só sinalizamos stale e, se o erro
    // persistir, checamos se a sessão expirou (o ES não expõe status HTTP).
    source.onerror = () => {
      if (disposed) return;
      store.setStatus("stale");
      errorCount += 1;
      if (errorCount >= 3 && !checking) {
        checking = true;
        fetch("/api/auth/session", { credentials: "include" })
          .then((response) => {
            if (response.status === 401) window.location.href = "/";
          })
          .catch(() => undefined)
          .finally(() => {
            checking = false;
            errorCount = 0;
          });
      }
    };

    return () => {
      disposed = true;
      source.close();
    };
  }, [store]);

  return <LiveContext.Provider value={store}>{children}</LiveContext.Provider>;
}
