"use client";

// Shell do /m: header + track de swipe horizontal entre as 6 abas + tab bar.
// Single-page: trocar de aba NUNCA remonta a página (o stream e o estado
// vivo sobrevivem); a URL é sincronizada com history.replaceState.

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Landmark,
  Map as MapIcon,
  Radar,
  RadioTower,
  Settings2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { TAB_IDS, type TabId } from "@/components/mobile/tabs";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import type { PlenarioState } from "@/lib/live-schemas";

const ghost = () => <div className="m-ghost">carregando módulo…</div>;

const TickerTab = dynamic(() => import("@/components/mobile/tabs/ticker"), { ssr: false, loading: ghost });
const PlenarioTab = dynamic(() => import("@/components/mobile/tabs/plenario"), { ssr: false, loading: ghost });
const RioTab = dynamic(() => import("@/components/mobile/tabs/rio"), { ssr: false, loading: ghost });
const RadarTab = dynamic(() => import("@/components/mobile/tabs/radar"), { ssr: false, loading: ghost });
const RedesTab = dynamic(() => import("@/components/mobile/tabs/redes"), { ssr: false, loading: ghost });
const C2026Tab = dynamic(() => import("@/components/mobile/tabs/c2026"), { ssr: false, loading: ghost });

const TABS: { id: TabId; label: string; Icon: typeof Activity; Component: React.ComponentType }[] = [
  { id: "ticker", label: "Ticker", Icon: Activity, Component: TickerTab },
  { id: "plenario", label: "Plenário", Icon: Landmark, Component: PlenarioTab },
  { id: "rio", label: "Rio", Icon: MapIcon, Component: RioTab },
  { id: "radar", label: "Radar", Icon: Radar, Component: RadarTab },
  { id: "redes", label: "Redes", Icon: RadioTower, Component: RedesTab },
  { id: "c2026", label: "2026", Icon: CalendarDays, Component: C2026Tab },
];

export function MobileShell({ initialTab }: { initialTab: TabId }) {
  const initialIndex = Math.max(0, TAB_IDS.indexOf(initialTab));
  const [index, setIndex] = useState(initialIndex);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([initialIndex]));
  const [width, setWidth] = useState(0);
  const [dragEnabled, setDragEnabled] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const plenario = useLiveChannel<PlenarioState>("plenario").data;
  const votacaoAtiva = plenario?.votacaoAtiva ?? false;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `/m/${TABS[index].id}${window.location.search}`);
    // ao trocar de aba, volta ao topo
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [index]);

  const goTo = useCallback((i: number) => {
    const next = Math.max(0, Math.min(TABS.length - 1, i));
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setIndex(next);
  }, []);

  return (
    <>
      <header className="m-header">
        <div className="m-header-brand">
          COCKPIT <span style={{ color: "var(--m-up)" }}>SOST</span>
          <small>O CANDIDATO · 2026</small>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveBadge ch="idx.sost" cadenceMs={2000} showLabel />
          <Link href="/m/config" aria-label="Configurações da watchlist">
            <Settings2 size={17} color="var(--m-muted)" />
          </Link>
        </div>
      </header>

      <div className="m-track-viewport" ref={viewportRef}>
        <motion.div
          className="m-track"
          style={{ touchAction: "pan-y" }}
          drag={width > 0 && dragEnabled ? "x" : false}
          dragConstraints={{ left: -(TABS.length - 1) * width, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          animate={{ x: -index * width }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 34 }}
          onPointerDownCapture={(event) => {
            // superfícies com gesto próprio (carrossel, pinch nos gráficos,
            // feeds horizontais) desligam o swipe de aba durante o toque
            const target = event.target as HTMLElement | null;
            setDragEnabled(!target?.closest("[data-no-swipe]"));
          }}
          onPointerUp={() => setDragEnabled(true)}
          onPointerCancel={() => setDragEnabled(true)}
          onDragEnd={(_, info) => {
            const threshold = width * 0.22;
            if (info.offset.x < -threshold || info.velocity.x < -480) goTo(index + 1);
            else if (info.offset.x > threshold || info.velocity.x > 480) goTo(index - 1);
            else goTo(index);
          }}
        >
          {TABS.map((tab, i) => {
            const adjacent = Math.abs(i - index) <= 1;
            const mounted = visited.has(i) || adjacent;
            return (
              <section
                key={tab.id}
                className="m-panel"
                data-hidden={!adjacent}
                aria-hidden={i !== index}
              >
                {mounted ? <tab.Component /> : null}
              </section>
            );
          })}
        </motion.div>
      </div>

      <nav className="m-tabbar" aria-label="Abas do cockpit">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            className={`m-tab ${i === index ? "active" : ""}`.trim()}
            aria-current={i === index ? "page" : undefined}
            onClick={() => goTo(i)}
          >
            {tab.id === "plenario" && votacaoAtiva ? <span className="m-tab-badge" aria-label="Votação em andamento" /> : null}
            <tab.Icon aria-hidden />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
