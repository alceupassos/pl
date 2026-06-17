"use client";

// Shell do /m: header + track de abas com SWIPE NATIVO (scroll-snap) + tab bar.
// Single-page: trocar de aba NUNCA remonta a página (o stream e o estado
// vivo sobrevivem); a URL é sincronizada com history.replaceState.
//
// O swipe é overflow-x + scroll-snap do próprio browser — nada de gesto JS:
// foi um drag="x" (framer-motion) no track que travava o scroll VERTICAL no
// touch (o pan handler disputava o gesto com o pan-y nativo). Com scroll
// nativo o browser desambigua vertical×horizontal sozinho, inclusive nos
// carrosséis internos (nested scroll).

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Crosshair,
  Landmark,
  Map as MapIcon,
  MessagesSquare,
  Radar,
  RadioTower,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { TAB_IDS, type TabId } from "@/components/mobile/tabs";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { OnboardingModal } from "@/components/mobile/ui/onboarding-modal";
import { logClientAccess } from "@/lib/log-client-access";
import type { PlenarioState } from "@/lib/live-schemas";

const ghost = () => <div className="m-ghost">carregando módulo…</div>;

const TickerTab = dynamic(() => import("@/components/mobile/tabs/ticker"), {
  ssr: false,
  loading: ghost,
});
const PlenarioTab = dynamic(() => import("@/components/mobile/tabs/plenario"), {
  ssr: false,
  loading: ghost,
});
const RioTab = dynamic(() => import("@/components/mobile/tabs/rio"), {
  ssr: false,
  loading: ghost,
});
const RadarTab = dynamic(() => import("@/components/mobile/tabs/radar"), {
  ssr: false,
  loading: ghost,
});
const RedesTab = dynamic(() => import("@/components/mobile/tabs/redes"), {
  ssr: false,
  loading: ghost,
});
const C2026Tab = dynamic(() => import("@/components/mobile/tabs/c2026"), {
  ssr: false,
  loading: ghost,
});
const EquipeTab = dynamic(() => import("@/components/mobile/tabs/equipe"), {
  ssr: false,
  loading: ghost,
});
const OportunidadesTab = dynamic(
  () => import("@/components/mobile/tabs/oportunidades"),
  { ssr: false, loading: ghost },
);
const PesquisasTab = dynamic(
  () => import("@/components/mobile/tabs/pesquisas"),
  { ssr: false, loading: ghost },
);
const GastosTab = dynamic(() => import("@/components/mobile/tabs/gastos"), {
  ssr: false,
  loading: ghost,
});
const VozTab = dynamic(() => import("@/components/mobile/tabs/voz"), {
  ssr: false,
  loading: ghost,
});

const TABS: {
  id: TabId;
  label: string;
  Icon: typeof Activity;
  Component: React.ComponentType;
}[] = [
  { id: "ticker", label: "Ticker", Icon: Activity, Component: TickerTab },
  { id: "redes", label: "Redes", Icon: RadioTower, Component: RedesTab },
  { id: "plenario", label: "Plenário", Icon: Landmark, Component: PlenarioTab },
  { id: "rio", label: "Rio", Icon: MapIcon, Component: RioTab },
  { id: "radar", label: "Radar", Icon: Radar, Component: RadarTab },
  { id: "equipe", label: "Equipe", Icon: Users, Component: EquipeTab },
  {
    id: "oportunidades",
    label: "Oportun.",
    Icon: Crosshair,
    Component: OportunidadesTab,
  },
  {
    id: "pesquisas",
    label: "Pesquisas",
    Icon: ClipboardList,
    Component: PesquisasTab,
  },
  { id: "gastos", label: "Gastos", Icon: Wallet, Component: GastosTab },
  { id: "c2026", label: "2026", Icon: CalendarDays, Component: C2026Tab },
  { id: "voz", label: "Voz", Icon: MessagesSquare, Component: VozTab },
];

export function MobileShell({ initialTab }: { initialTab: TabId }) {
  const initialIndex = Math.max(0, TAB_IDS.indexOf(initialTab));
  const [index, setIndex] = useState(initialIndex);
  const [visited, setVisited] = useState<ReadonlySet<number>>(
    () => new Set([initialIndex]),
  );
  const [registered, setRegistered] = useState(
    () =>
      typeof window !== "undefined" && localStorage.getItem("scp_reg") === "1",
  );
  // Incrementar ao tocar em Ticker remonta a aba — todos os cards voltam compactos.
  const [tickerKey, setTickerKey] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tabbarRef = useRef<HTMLElement>(null);
  const rafRef = useRef(0);
  const lockedScrollRef = useRef(0);

  const plenario = useLiveChannel<PlenarioState>("plenario").data;
  const votacaoAtiva = plenario?.votacaoAtiva ?? false;

  // posiciona o scroll na aba inicial (deep link) sem animação
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
    // intencionalmente só no mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      `/m/${TABS[index].id}${window.location.search}`,
    );
    // centraliza a aba ativa na tab bar rolável
    tabbarRef.current
      ?.querySelectorAll<HTMLButtonElement>(".m-tab")
      [
        index
      ]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [index]);

  const prevTabIndex = useRef(index);
  useEffect(() => {
    if (prevTabIndex.current === index) return;
    prevTabIndex.current = index;
    const tab = TABS[index];
    const uid =
      typeof window !== "undefined"
        ? (localStorage.getItem("scp_uid") ?? undefined)
        : undefined;
    logClientAccess("mobile_tab_view", `/m/${tab.id}`, { tab: tab.id, uid });
  }, [index]);

  const setActive = useCallback((i: number) => {
    const next = Math.max(0, Math.min(TABS.length - 1, i));
    setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    setIndex(next);
  }, []);

  // sincroniza o índice com o scroll nativo (coalescido por rAF)
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

  const resetTickerTab = useCallback(() => {
    setTickerKey((k) => k + 1);
    requestAnimationFrame(() => {
      const tickerIndex = TAB_IDS.indexOf("ticker");
      const panel =
        viewportRef.current?.querySelectorAll<HTMLElement>(".m-panel")[
          tickerIndex
        ];
      panel?.scrollTo({ top: 0, behavior: "auto" });
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const el = viewportRef.current;
      const next = Math.max(0, Math.min(TABS.length - 1, i));
      setActive(next);
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el?.scrollTo({
        left: next * el.clientWidth,
        behavior: reduced ? "auto" : "smooth",
      });
    },
    [setActive],
  );

  const onTabClick = useCallback(
    (i: number) => {
      if (TABS[i]?.id === "ticker") resetTickerTab();
      goTo(i);
    },
    [goTo, resetTickerTab],
  );

  // Swipe em carrosséis internos (.m-carousel) deve rolar o carrossel, não trocar
  // de aba. Enquanto o dedo está dentro de um carrossel, travamos o scroll-x do
  // viewport (pager) para o gesto horizontal ir ao carrossel. Salva/restaura o
  // scrollLeft p/ não dar pulo ao alternar overflow.
  const onViewportTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.(".m-carousel")) {
      const el = viewportRef.current;
      if (el) {
        lockedScrollRef.current = el.scrollLeft;
        el.style.overflowX = "hidden";
      }
    }
  }, []);
  const onViewportTouchEnd = useCallback(() => {
    const el = viewportRef.current;
    if (el && el.style.overflowX === "hidden") {
      el.style.overflowX = "";
      el.scrollLeft = lockedScrollRef.current;
    }
  }, []);

  return (
    <>
      {!registered && (
        <OnboardingModal onComplete={() => setRegistered(true)} />
      )}
      <header className="m-header">
        <div className="m-header-brand">
          COCKPIT <span style={{ color: "var(--m-up)" }}>ELEITORAL 2026</span>
          {/* carimbo de versão visível — diagnóstico de cache no aparelho.
              O minor sobe sozinho a cada build (ver next.config.ts). */}
          <small>
            SÓSTENES CAVALCANTE · 2026 · {process.env.NEXT_PUBLIC_APP_VERSION ?? "v4"}
          </small>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LiveBadge ch="idx.sost" cadenceMs={2000} showLabel />
          <Link href="/m/config" aria-label="Configurações da watchlist">
            <Settings2 size={17} color="var(--m-muted)" />
          </Link>
        </div>
      </header>

      <div
        className="m-track-viewport"
        ref={viewportRef}
        onScroll={onScroll}
        onTouchStart={onViewportTouchStart}
        onTouchEnd={onViewportTouchEnd}
        onTouchCancel={onViewportTouchEnd}
      >
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
                {mounted ? (
                  tab.id === "ticker" ? (
                    <TickerTab key={tickerKey} />
                  ) : (
                    <tab.Component />
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <nav className="m-tabbar" aria-label="Abas do cockpit" ref={tabbarRef}>
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            className={`m-tab ${i === index ? "active" : ""}`.trim()}
            aria-current={i === index ? "page" : undefined}
            onClick={() => onTabClick(i)}
          >
            {tab.id === "plenario" && votacaoAtiva ? (
              <span className="m-tab-badge" aria-label="Votação em andamento" />
            ) : null}
            <tab.Icon aria-hidden />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
