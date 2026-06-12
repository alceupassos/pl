"use client";

// Bolinha roxa com ícone Sparkles (estrelinhas IA) — abre bottom sheet com leitura
// do gráfico e dica de ação. Nunca expõe o provedor/modelo.

import { Sparkles } from "lucide-react";
import { useCallback, useState } from "react";

import { BottomSheet } from "@/components/mobile/ui/bottom-sheet";

type LeituraPayload = { leitura: string; dica: string };

const cache = new Map<string, LeituraPayload>();
const FALLBACK: LeituraPayload = {
  leitura: "Os números deste gráfico indicam o ritmo atual da campanha — acompanhe a tendência antes de reagir.",
  dica: "Priorize a ação com maior retorno por esforço e meça o resultado na próxima semana.",
};

export function LeituraIA({
  card,
  contexto,
  titulo = "Leitura do gráfico",
}: {
  /** Id único do card (ex.: ticker-sost-idx). */
  card: string;
  /** Números e rótulos compactos do gráfico para a IA. */
  contexto: string;
  titulo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LeituraPayload | null>(null);

  const buscar = useCallback(
    async (force = false) => {
      if (!force) {
        const hit = cache.get(card);
        if (hit) {
          setData(hit);
          return;
        }
      } else {
        cache.delete(card);
      }
      setLoading(true);
      setData(null);
      try {
        const res = await fetch("/api/oracle", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "leitura", card, context: contexto }),
        });
        if (!res.ok) throw new Error("http");
        const json = (await res.json()) as { leitura?: string; dica?: string };
        const payload: LeituraPayload = {
          leitura:
            typeof json.leitura === "string" && json.leitura.trim()
              ? json.leitura.trim()
              : FALLBACK.leitura,
          dica:
            typeof json.dica === "string" && json.dica.trim() ? json.dica.trim() : FALLBACK.dica,
        };
        cache.set(card, payload);
        setData(payload);
      } catch {
        setData(FALLBACK);
      } finally {
        setLoading(false);
      }
    },
    [card, contexto],
  );

  const abrir = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    void buscar(false);
  };

  const refazer = () => {
    void buscar(true);
  };

  return (
    <>
      <button
        type="button"
        className="m-ia-dot"
        onClick={abrir}
        aria-label={`Leitura inteligente: ${titulo}`}
        data-no-swipe
      >
        <Sparkles size={14} strokeWidth={2.2} aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={`${titulo} · IA`}>
        {loading ? (
          <div className="m-ghost">lendo o gráfico…</div>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div className="m-muted-c" style={{ fontSize: 10, letterSpacing: "0.06em", marginBottom: 4 }}>
                LEITURA
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, color: "#cfd6e4" }}>{data.leitura}</p>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.35)",
              }}
            >
              <div style={{ fontSize: 10, letterSpacing: "0.06em", color: "#c4b5fd", marginBottom: 4 }}>
                DICA DE AÇÃO
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0, color: "#e8e0ff", fontWeight: 600 }}>
                {data.dica}
              </p>
            </div>
            <button type="button" className="m-btn" onClick={refazer} style={{ alignSelf: "flex-start" }}>
              ↻ nova leitura
            </button>
          </div>
        ) : null}
      </BottomSheet>
    </>
  );
}
