"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BarChart2,
  CalendarDays,
  Radio,
  Radar,
  Settings2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { TAB_IDS_W, type TabIdW } from "@/components/w/tabs";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { logClientAccess } from "@/lib/log-client-access";

const ghost = () => <div className="m-ghost">carregando…</div>;

const MercadosTab   = dynamic(() => import("@/components/w/tabs/mercados"),   { ssr: false, loading: ghost });
const PesquisasTab  = dynamic(() => import("@/components/w/tabs/pesquisas"),  { ssr: false, loading: ghost });
const CandidatosTab = dynamic(() => import("@/components/w/tabs/candidatos"), { ssr: false, loading: ghost });
const ApuracaoTab   = dynamic(() => import("@/components/w/tabs/apuracao"),   { ssr: false, loading: ghost });
const HistoricoTab  = dynamic(() => import("@/components/w/tabs/historico"),  { ssr: false, loading: ghost });
const RadarTab      = dynamic(() => import("@/components/w/tabs/radar"),      { ssr: false, loading: ghost });
const ConfigTab     = dynamic(() => import("@/components/w/tabs/config"),     { ssr: false, loading: ghost });

type TabDef = {
  id: TabIdW;
  label: string;
  Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  Component: React.ComponentType;
};

const TABS: TabDef[] = [
  { id: "mercados",   label: "Mercados",   Icon: TrendingUp,  Component: MercadosTab },
  { id: "pesquisas",  label: "Pesquisas",  Icon: BarChart2,   Component: PesquisasTab },
  { id: "candidatos", label: "Candidatos", Icon: Users,        Component: CandidatosTab },
  { id: "apuracao",   label: "Apuração",   Icon: Radio,        Component: ApuracaoTab },
  { id: "historico",  label: "Histórico",  Icon: CalendarDays, Component: HistoricoTab },
  { id: "radar",      label: "Radar",      Icon: Radar,        Component: RadarTab },
  { id: "config",     label: "Config",     Icon: Settings2,    Component: ConfigTab },
];

export function WShell({ initialTab }: { initialTab: TabIdW }) {
  const initialIndex = Math.max(0, TAB_IDS_W.indexOf(initialTab));
  const [index, setIndex] = useState(initialIndex);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([initialIndex]));
  const viewportRef = useRef<HTMLDivElement>(null);
  const tabbarRef = useRef<HTMLElement>(null);
  const rafRef = useRef(0);

  // posiciona no deep link sem animação
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `/w/${TABS[index].id}${window.location.search}`);
    tabbarRef.current
      ?.querySelectorAll<HTMLButtonElement>(".m-tab")
      [index]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  const prevTabIndex = useRef(index);
  useEffect(() => {
    if (prevTabIndex.current === index) return;
    prevTabIndex.current = index;
    const tab = TABS[index];
    logClientAccess("mobile_tab_view", `/w/${tab.id}`, { tab: tab.id });
  }, [index]);

  const setActive = useCallback((i: number) => {
    const next = Math.max(0, Math.min(TABS.length - 1, i));
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setIndex(next);
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = viewportRef.current;
      if (!el || el.clientWidth === 0) return;
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActive(idx);
    });
  }, [setActive]);

  const goTo = useCallback(
    (i: number) => {
      const el = viewportRef.current;
      const next = Math.max(0, Math.min(TABS.length - 1, i));
      setActive(next);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [setActive],
  );

  return (
    <>
      <header className="m-header">
        <div className="m-header-brand">
          MERCADOS <span className="w-brand-accent">BR</span>
          <small>ELEIÇÕES · 2026</small>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveBadge ch="alerts" cadenceMs={10000} showLabel />
          <Link href="/w/config" aria-label="Configurações">
            <Settings2 size={17} color="var(--m-muted)" />
          </Link>
        </div>
      </header>

      <div className="m-track-viewport" ref={viewportRef} onScroll={onScroll}>
        <div className="m-track">
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
        </div>
      </div>

      <nav className="m-tabbar" aria-label="Abas do cockpit eleitoral" ref={tabbarRef}>
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            className={`m-tab ${i === index ? "active" : ""}`.trim()}
            aria-current={i === index ? "page" : undefined}
            onClick={() => goTo(i)}
          >
            <tab.Icon aria-hidden />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
