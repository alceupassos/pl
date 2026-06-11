"use client";

import { useEffect, useRef } from "react";

type EChartProps = {
  /** Objeto `option` do ECharts. */
  option: Record<string, unknown>;
  /** Carrega echarts-gl (necessário para séries 3D). */
  use3D?: boolean;
  height?: number | string;
  className?: string;
  /** Callback quando o usuário clica numa série (ex.: tile do mapa). */
  onSelect?: (name: string) => void;
};

type EInstance = {
  setOption: (
    o: unknown,
    opts?: boolean | { notMerge?: boolean; replaceMerge?: string[] },
  ) => void;
  resize: () => void;
  dispose: () => void;
  on: (e: string, cb: (p: { name?: string }) => void) => void;
  dispatchAction: (action: { type: string }) => void;
};
type EModule = {
  init: (
    el: HTMLElement,
    theme?: unknown,
    opts?: { renderer?: string },
  ) => EInstance;
};

// Carregamento client-only via import dinâmico (evita SSR do echarts-gl).
export function EChart({
  option,
  use3D,
  height = 280,
  className,
  onSelect,
}: EChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EInstance | null>(null);
  // Mantém option/onSelect atuais sem escrever refs durante o render.
  const latest = useRef({ option, onSelect });
  useEffect(() => {
    latest.current = { option, onSelect };
  });

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let tries = 0;

    const mount = (echarts: EModule) => {
      if (disposed || !ref.current || chartRef.current) return;
      const el = ref.current;
      // Espera o container ter tamanho real antes de inicializar (evita 0×0).
      if ((el.offsetHeight === 0 || el.offsetWidth === 0) && tries++ < 40) {
        raf = requestAnimationFrame(() => mount(echarts));
        return;
      }
      const inst = echarts.init(el, undefined, { renderer: "canvas" });
      chartRef.current = inst;
      inst.setOption(latest.current.option);
      inst.on("click", (p) => {
        if (p?.name) latest.current.onSelect?.(p.name);
      });
      // O ResizeObserver cobre toda mudança real de tamanho do container
      // (rotação, resize de janela, breakpoints). Não escutamos window.resize:
      // no mobile ele dispara em rajada quando a barra de URL retrai durante o
      // scroll — sem o container mudar — e cada resize() é um redraw síncrono.
      ro = new ResizeObserver(() => chartRef.current?.resize());
      ro.observe(el);
    };

    (async () => {
      const mod = (await import("echarts")) as unknown as Partial<EModule> & {
        default?: EModule;
      };
      const echarts = (mod.init ? mod : mod.default) as EModule;
      if (use3D) {
        try {
          await import("echarts-gl");
        } catch {
          /* segue sem 3D */
        }
      }
      mount(echarts);
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, [use3D]);

  useEffect(() => {
    // Fecha tooltip aberto por toque antes de mudar os dados — no mobile ele
    // ficaria mostrando números antigos.
    chartRef.current?.dispatchAction({ type: "hideTip" });
    // replaceMerge em `series` mantém transições animadas nos updates
    // (notMerge=true reiniciaria a animação de entrada a cada tick).
    chartRef.current?.setOption(option, { replaceMerge: ["series"] });
  }, [option]);

  return (
    <div ref={ref} className={className} style={{ width: "100%", height }} />
  );
}
