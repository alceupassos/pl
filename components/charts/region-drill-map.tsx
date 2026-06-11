"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { REGIONS } from "@/lib/mock/rj-regions";
import type { RegionId } from "@/lib/mock/types";

type Props = {
  /** Métrica por UF (Brasil). */
  brasil: { sigla: string; value: number }[];
  /** Chamado ao clicar numa região do RJ. */
  onRegionChange?: (id: RegionId) => void;
  height?: number | string;
};

type EInstance = {
  setOption: (o: unknown, replace?: boolean) => void;
  resize: () => void;
  dispose: () => void;
  on: (e: string, cb: (p: { name?: string }) => void) => void;
  off: (e: string) => void;
};
type EModule = {
  init: (
    el: HTMLElement,
    theme?: unknown,
    opts?: { renderer?: string },
  ) => EInstance;
  registerMap: (name: string, geo: unknown) => void;
};

const mapReady = new Map<string, Promise<void>>();
function ensureMap(echarts: EModule, name: string, url: string): Promise<void> {
  let p = mapReady.get(name);
  if (!p) {
    p = fetch(url)
      .then((r) => r.json())
      .then((geo) => echarts.registerMap(name, geo));
    mapReady.set(name, p);
  }
  return p;
}

const REGION_COLOR: Record<string, string> = {
  metropolitana: "#3b82f6",
  "costa-verde": "#22c55e",
  "baixadas-litoraneas": "#06b6d4",
  serrana: "#8b5cf6",
  "norte-fluminense": "#f0c030",
  "noroeste-fluminense": "#fb923c",
  "medio-paraiba": "#ec4899",
  "centro-sul": "#14b8a6",
};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Município (normalizado) → região, a partir do mock.
const MUN_TO_REGION = new Map<
  string,
  { id: string; nome: string; cobertura: number }
>();
for (const r of REGIONS) {
  for (const m of r.municipios) {
    MUN_TO_REGION.set(norm(m.nome), {
      id: r.id,
      nome: r.nome,
      cobertura: m.cobertura,
    });
  }
}

// Dados para o mapa de municípios (nome real casa com o GeoJSON).
const RJ_MUNI_DATA = REGIONS.flatMap((r) =>
  r.municipios.map((m) => ({
    name: m.nome,
    value: m.cobertura,
    regiao: r.nome,
    itemStyle: { areaColor: REGION_COLOR[r.id] ?? "#2a2a38" },
  })),
);

export function RegionDrillMap({
  brasil,
  onRegionChange,
  height = 380,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EInstance | null>(null);
  const modRef = useRef<EModule | null>(null);
  const [level, setLevel] = useState<"brasil" | "rj">("brasil");
  const stateRef = useRef({ brasil, onRegionChange, level });
  useEffect(() => {
    stateRef.current = { brasil, onRegionChange, level };
  });

  const applyOption = useCallback(() => {
    const inst = chartRef.current;
    if (!inst) return;
    inst.off("click");
    if (stateRef.current.level === "brasil") {
      inst.setOption(brasilOption(stateRef.current.brasil), true);
      inst.on("click", (p) => {
        if (p?.name === "RJ") setLevel("rj");
      });
    } else {
      inst.setOption(rjOption(), true);
      inst.on("click", (p) => {
        if (!p?.name) return;
        const reg = MUN_TO_REGION.get(norm(p.name));
        if (reg) stateRef.current.onRegionChange?.(reg.id as RegionId);
      });
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let tries = 0;

    const mount = (echarts: EModule) => {
      if (disposed || !ref.current || chartRef.current) return;
      const el = ref.current;
      if ((el.offsetHeight === 0 || el.offsetWidth === 0) && tries++ < 40) {
        raf = requestAnimationFrame(() => mount(echarts));
        return;
      }
      const inst = echarts.init(el, undefined, { renderer: "canvas" });
      chartRef.current = inst;
      modRef.current = echarts;
      applyOption();
      ro = new ResizeObserver(() => chartRef.current?.resize());
      ro.observe(el);
    };

    (async () => {
      const m = (await import("echarts")) as unknown as Partial<EModule> & {
        default?: EModule;
      };
      const echarts = (m.init ? m : m.default) as EModule;
      await ensureMap(echarts, "brazil", "/maps/brazil-states.geojson");
      mount(echarts);
    })();

    // Sem window.resize: o ResizeObserver acima já cobre mudanças reais do
    // container, e a barra de URL do mobile dispara resize em rajada no scroll.
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [applyOption]);

  useEffect(() => {
    (async () => {
      const echarts = modRef.current;
      if (!echarts || !chartRef.current) return;
      if (level === "rj")
        await ensureMap(echarts, "rj-mun", "/maps/rj-municipios.geojson");
      applyOption();
    })();
  }, [level, brasil, applyOption]);

  return (
    <div>
      <div className="drill-bar">
        <button
          type="button"
          className={`drill-crumb ${level === "brasil" ? "active" : ""}`}
          onClick={() => setLevel("brasil")}
        >
          🇧🇷 Brasil
        </button>
        {level === "rj" ? (
          <>
            <span className="drill-sep">▸</span>
            <span className="drill-crumb active">Rio de Janeiro · regiões</span>
          </>
        ) : (
          <span className="drill-hint">clique no RJ para abrir as regiões</span>
        )}
      </div>
      <div ref={ref} style={{ width: "100%", height }} />
      {level === "rj" && (
        <div className="drill-legend">
          {REGIONS.map((r) => (
            <span className="drill-leg" key={r.id}>
              <span
                className="drill-dot"
                style={{ background: REGION_COLOR[r.id] }}
              />
              {r.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function brasilOption(data: { sigla: string; value: number }[]) {
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(16,16,24,0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#e6e6f0", fontSize: 12 },
      formatter: (p: { name?: string; value?: number }) =>
        `${p.name}: ${p.value != null && !Number.isNaN(p.value) ? p.value : "—"}`,
    },
    visualMap: {
      min: 0,
      max: 60,
      left: 8,
      bottom: 8,
      calculable: true,
      text: ["alta", "baixa"],
      textStyle: { color: "#8a8aaa" },
      inRange: {
        color: ["#142a1c", "#1e7a3e", "#22c55e", "#f0c030", "#ef4444"],
      },
    },
    series: [
      {
        type: "map",
        map: "brazil",
        nameProperty: "sigla",
        roam: false,
        label: { show: false },
        itemStyle: {
          borderColor: "rgba(255,255,255,0.12)",
          areaColor: "#15151d",
        },
        emphasis: {
          label: { show: true, color: "#fff" },
          itemStyle: { areaColor: "#2a2a38" },
        },
        data: data.map((d) => ({
          name: d.sigla,
          value: d.value,
          ...(d.sigla === "RJ"
            ? {
                itemStyle: {
                  areaColor: "#1e7a3e",
                  borderColor: "#22c55e",
                  borderWidth: 1.5,
                },
              }
            : {}),
        })),
      },
    ],
  };
}

function rjOption() {
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(16,16,24,0.96)",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#e6e6f0", fontSize: 12 },
      formatter: (p: {
        name?: string;
        data?: { regiao?: string; value?: number };
      }) =>
        p.data?.regiao
          ? `<b>${p.name}</b><br/>Região: ${p.data.regiao}<br/>Cobertura: ${p.data.value}%`
          : `${p.name}<br/><span style="color:#8a8aaa">fora da base mapeada</span>`,
    },
    series: [
      {
        type: "map",
        map: "rj-mun",
        nameProperty: "name",
        roam: true,
        scaleLimit: { min: 0.8, max: 6 },
        label: { show: false },
        itemStyle: { borderColor: "rgba(0,0,0,0.35)", areaColor: "#20202c" },
        emphasis: {
          label: { show: true, color: "#fff", fontSize: 10 },
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.6)" },
        },
        data: RJ_MUNI_DATA,
      },
    ],
  };
}
