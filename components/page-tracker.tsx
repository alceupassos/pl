"use client";

// Rastreio de TEMPO POR PÁGINA, global (montado no root layout → cobre todas as
// rotas sem editar cada página). Ao sair de uma rota (troca de pathname) ou ao
// esconder/fechar a aba (pagehide), envia um beacon { event:"page_time", path, ms }
// para /api/access-log (que já persiste com IP+geo). Não substitui os *_page_view
// de entrada; complementa com a permanência.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MIN_MS = 1000; // ignora passagens muito curtas

function enviar(path: string, ms: number) {
  if (ms < MIN_MS) return;
  const payload = JSON.stringify({
    event: "page_time",
    path,
    metadata: { ms: Math.round(ms) },
  });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/access-log", blob);
      if (ok) return;
    }
  } catch {
    /* cai no fetch abaixo */
  }
  // fallback: keepalive permite enviar durante o unload
  void fetch("/api/access-log", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function PageTracker() {
  const pathname = usePathname();
  const inicioRef = useRef<number>(0);

  useEffect(() => {
    // entra na rota
    const t0 =
      typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    inicioRef.current = t0;
    const pathAtual = pathname || "/";

    const flush = () => {
      const agora =
        typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      const ms = agora - inicioRef.current;
      inicioRef.current = agora; // evita contar duas vezes o mesmo intervalo
      enviar(pathAtual, ms);
    };

    const onPageHide = () => flush();

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // saiu da rota (troca de pathname ou desmontagem)
      flush();
    };
  }, [pathname]);

  return null;
}
