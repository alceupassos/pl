"use client";

import { useEffect, useRef } from "react";

type StateValue = { sigla: string; value: number };

type BrazilMapProps = {
  data: StateValue[];
  max?: number;
  height?: number | string;
  onSelect?: (sigla: string) => void;
};

type EInstance = {
  setOption: (o: unknown, r?: boolean) => void;
  resize: () => void;
  dispose: () => void;
  on: (e: string, cb: (p: { name?: string }) => void) => void;
};
type EModule = {
  init: (
    el: HTMLElement,
    theme?: unknown,
    opts?: { renderer?: string },
  ) => EInstance;
  registerMap: (name: string, geo: unknown) => void;
};

// Cache de registro de mapa compartilhado entre instâncias (sem corrida).
const mapReady = new Map<string, Promise<void>>();
function ensureMap(echarts: EModule, name: string, url: string): Promise<void> {
  let p = mapReady.get(name);
  if (!p) {
    p = fetch(url)
      .then((r) => r.json())
      .then((geo) => {
        echarts.registerMap(name, geo);
      });
    mapReady.set(name, p);
  }
  return p;
}

// Mapa coroplético do Brasil (estados) via ECharts + GeoJSON vendorizado.
export function BrazilMap({
  data,
  max = 100,
  height = 360,
  onSelect,
}: BrazilMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EInstance | null>(null);
  const latest = useRef({ data, onSelect, max });
  useEffect(() => {
    latest.current = { data, onSelect, max };
  });

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
      inst.setOption(buildOption(latest.current.data, latest.current.max));
      inst.on("click", (p) => {
        if (p?.name) latest.current.onSelect?.(p.name);
      });
      ro = new ResizeObserver(() => chartRef.current?.resize());
      ro.observe(el);
    };

    (async () => {
      const mod = (await import("echarts")) as unknown as Partial<EModule> & {
        default?: EModule;
      };
      const echarts = (mod.init ? mod : mod.default) as EModule;
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
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(buildOption(data, max), true);
  }, [data, max]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}

function buildOption(data: StateValue[], max: number) {
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
      max,
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
        scaleLimit: { min: 1, max: 3 },
        label: { show: false },
        itemStyle: {
          borderColor: "rgba(255,255,255,0.12)",
          areaColor: "#15151d",
        },
        emphasis: {
          label: { show: true, color: "#fff" },
          itemStyle: {
            areaColor: "#2a2a38",
            shadowBlur: 10,
            shadowColor: "rgba(0,0,0,0.5)",
          },
        },
        data: data.map((d) => ({ name: d.sigla, value: d.value })),
      },
    ],
  };
}
