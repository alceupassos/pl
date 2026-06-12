"use client";

// Mapa do RJ por município (geojson já existente em public/maps) com duas
// camadas alternáveis: pulsos de menção (vivo, via SSE) e votação 2022
// (estática, mock determinístico). Pinch/pan nativos do roam do ECharts.

import { useEffect, useMemo, useRef, useState } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { getVotos2022Municipio } from "@/lib/data/votos-2022-sostenes";
import type { RioPulsos } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";

type EInstance = {
  setOption: (o: unknown, opts?: { replaceMerge?: string[] }) => void;
  resize: () => void;
  dispose: () => void;
};
type EModule = {
  init: (el: HTMLElement, theme?: unknown, opts?: { renderer?: string }) => EInstance;
  registerMap: (name: string, geo: unknown) => void;
  getMap?: (name: string) => unknown;
};

let geoLoaded: Promise<string[]> | null = null;
let geoNames: string[] = [];

function ensureRjMap(echarts: EModule): Promise<string[]> {
  if (!geoLoaded) {
    geoLoaded = fetch("/maps/rj-municipios.geojson")
      .then((r) => r.json())
      .then((geo: { features?: { properties?: { name?: string } }[] }) => {
        echarts.registerMap("rj-mun", geo);
        geoNames = (geo.features ?? [])
          .map((f) => f.properties?.name ?? "")
          .filter(Boolean);
        return geoNames;
      });
  }
  return geoLoaded;
}

function norm(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function hashNome(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i += 1) h = (h * 31 + nome.charCodeAt(i)) | 0;
  return h >>> 0;
}

type Camada = "pulsos" | "v2022";

function buildOption(camada: Camada, nomes: string[], pulsos: RioPulsos["pulsos"]) {
  const pulsoPorNome = new Map(pulsos.map((p) => [norm(p.municipio), p.intensidade]));
  const data = nomes.map((nome) => {
    if (camada === "v2022") {
      return { name: nome, value: getVotos2022Municipio(nome) };
    }
    const pulso = pulsoPorNome.get(norm(nome));
    return { name: nome, value: Math.round((pulso ?? 0.06 + (hashNome(nome) % 20) / 100) * 100) };
  });
  return {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(10,13,19,0.97)",
      borderColor: "#1e2638",
      textStyle: { color: "#e8ecf4", fontSize: 11 },
      confine: true,
      formatter: (p: { name?: string; value?: number }) =>
        `${p.name}: ${typeof p.value === "number" && !Number.isNaN(p.value) ? p.value.toLocaleString("pt-BR") : "—"}${camada === "pulsos" ? " menções" : " votos 2022"}`,
    },
    visualMap: {
      show: false,
      min: 0,
      max: camada === "v2022" ? Math.max(...data.map((d) => d.value), 1) : 100,
      inRange: {
        color:
          camada === "pulsos"
            ? ["#121724", "#14532d", "#16C784", "#F5A623", "#EA3943"]
            : ["#121724", "#16314f", "#1a4fa0", "#3b82f6", "#22D3EE"],
      },
    },
    series: [
      {
        type: "map",
        map: "rj-mun",
        roam: true,
        scaleLimit: { min: 1, max: 5 },
        itemStyle: { borderColor: "#1e2638", borderWidth: 0.6 },
        emphasis: { label: { show: true, color: "#fff", fontSize: 9 }, itemStyle: { areaColor: "#F5A623" } },
        select: { disabled: true },
        label: { show: false },
        data,
      },
    ],
  };
}

export function MapaRj() {
  const rio = useLiveChannel<RioPulsos>("rio.pulsos").data;
  const [camada, setCamada] = useState<Camada>("pulsos");
  const [pronto, setPronto] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EInstance | null>(null);

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const mod = (await import("echarts")) as unknown as Partial<EModule> & {
        default?: EModule;
      };
      const echarts = (mod.init ? mod : mod.default) as EModule;
      await ensureRjMap(echarts);
      if (disposed || !hostRef.current || chartRef.current) return;
      chartRef.current = echarts.init(hostRef.current, undefined, { renderer: "canvas" });
      ro = new ResizeObserver(() => chartRef.current?.resize());
      ro.observe(hostRef.current);
      setPronto(true);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  const option = useMemo(() => {
    if (!pronto || geoNames.length === 0) return null;
    return buildOption(camada, geoNames, rio?.pulsos ?? []);
  }, [pronto, camada, rio?.pulsos]);

  useEffect(() => {
    if (option) chartRef.current?.setOption(option, { replaceMerge: ["series"] });
  }, [option]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Mapa vivo · RJ por município</span>
        <LeituraIA
          card="rio-mapa"
          contexto={`camada ${camada}; ${rio?.pulsos.length ?? 0} pulsos${rio?.pulsos[0] ? `; top ${rio.pulsos[0].municipio} ${Math.round(rio.pulsos[0].intensidade * 100)}` : ""}`}
          titulo="Mapa vivo · RJ"
        />
        <FonteBadge
          real={camada === "v2022"}
          como={camada === "v2022" ? FONTE_COMO.votos2022 : undefined}
        />
        <LiveBadge ch="rio.pulsos" cadenceMs={8000} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          className={`m-pill ${camada === "pulsos" ? "up" : ""}`.trim()}
          onClick={() => setCamada("pulsos")}
          aria-pressed={camada === "pulsos"}
        >
          pulsos de menção
        </button>
        <button
          type="button"
          className={`m-pill ${camada === "v2022" ? "up" : ""}`.trim()}
          onClick={() => setCamada("v2022")}
          aria-pressed={camada === "v2022"}
        >
          votação 2022
        </button>
      </div>
      <div ref={hostRef} style={{ width: "100%", height: 240 }} data-no-swipe />
      {rio?.pulsos.length ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {rio.pulsos.slice(0, 5).map((p, i) => (
            <span className="m-pill amarelo" key={`${p.municipio}:${i}`}>
              ⚡ {p.municipio}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
