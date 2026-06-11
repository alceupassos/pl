"use client";

// Card do oráculo: busca 1 insight de IA por seção quando o card entra no
// viewport. Cache module-level → 1 fetch por seção por sessão; o botão ↻
// invalida o cache da seção e refaz a consulta.

import { useEffect, useRef, useState } from "react";

// Cache por seção (vive enquanto o bundle viver — sessão SPA).
const insightCache = new Map<string, string>();

const FALLBACK = "Sem leitura agora — siga o número.";

export function MOraculo({
  section,
  context = "",
}: {
  section: string;
  context?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  // Incrementa para forçar refetch após limpar o cache.
  const [reloadTick, setReloadTick] = useState(0);

  // Só consulta quando o card aparece na tela.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const cached = insightCache.get(section);
    if (cached) {
      // setState síncrono em efeito é proibido — adia um frame.
      const raf = requestAnimationFrame(() => setInsight(cached));
      return () => cancelAnimationFrame(raf);
    }
    let cancelled = false;
    fetch("/api/oracle", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, context }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("http"))))
      .then((data: { insight?: string }) => {
        if (cancelled) return;
        const text =
          typeof data?.insight === "string" && data.insight.trim()
            ? data.insight.trim()
            : FALLBACK;
        insightCache.set(section, text);
        setInsight(text);
      })
      .catch(() => {
        if (cancelled) return;
        setInsight(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
    // context não dispara refetch — a 1ª leitura da seção vale para a sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, section, reloadTick]);

  const refazer = () => {
    insightCache.delete(section);
    setInsight(null);
    setReloadTick((t) => t + 1);
  };

  return (
    <div ref={wrapRef} className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">🔮 ORÁCULO</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span className="m-pill">IA · estratégia</span>
          <button
            type="button"
            className="m-pill"
            onClick={refazer}
            aria-label="Refazer leitura do oráculo"
          >
            ↻
          </button>
        </span>
      </div>
      {insight ? (
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            fontStyle: "italic",
            color: "var(--m-text)",
          }}
        >
          {insight}
        </div>
      ) : (
        <div className="m-ghost">consultando o oráculo…</div>
      )}
    </div>
  );
}
