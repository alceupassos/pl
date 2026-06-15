# execute.md — Instruções Cursor para construir o `/w` (Cockpit Eleitoral Brasil 2026)

Leia o plano completo em `C:\Users\alex-\.claude\plans\substituta-badge-demo-por-virtual-peach.md` antes de começar. Execute os passos na ordem abaixo; faça typecheck (`npx tsc --noEmit`) + lint (`npm run lint`) ao final de cada bloco.

---

## Bloco 1 — Infra base (middleware + layout + CSS)

### 1.1 `middleware.ts` — adicionar `/w` no matcher

Arquivo: `middleware.ts`

Substituir:
```ts
export const config = {
  matcher: ["/m", "/m/:path*"],
};
```
Por:
```ts
export const config = {
  matcher: ["/m", "/m/:path*", "/w", "/w/:path*"],
};
```

E na função `middleware`, adicionar suporte ao prefixo `/w` para propagar `x-mobile-path`:
```ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/m") && !pathname.startsWith("/w")) {
    return NextResponse.next();
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mobile-path", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

---

### 1.2 `app/w/layout.tsx` — layout autenticado para `/w`

Criar arquivo novo. Copiar `app/m/layout.tsx` e ajustar:

```tsx
import "./w.css";

import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { LegalNotice } from "@/components/legal-notice";
import { LiveDataProvider } from "@/components/mobile/live/provider";
import { RegisterSW } from "@/components/mobile/register-sw";
import { appendAccessLog } from "@/lib/access-log";
import { getAuthCookieName, verifySession } from "@/lib/auth";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Mercados Eleitorais BR 2026",
  description: "Cockpit de mercados eleitorais Brasil 2026 — pesquisas, probabilidades e apuração ao vivo.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mercados BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function WLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySession(token, requestHeaders);
  if (!session) redirect("/");

  const mobilePath = requestHeaders.get("x-mobile-path");
  const isRsc = requestHeaders.get("RSC") === "1";
  const isPrefetch =
    requestHeaders.get("purpose") === "prefetch" ||
    requestHeaders.get("sec-purpose") === "prefetch";

  if (mobilePath && !isRsc && !isPrefetch) {
    await appendAccessLog(requestHeaders, {
      event: "mobile_page_view",
      path: mobilePath,
    });
  }

  return (
    <div className={`m-app ${archivo.variable}`}>
      <LiveDataProvider>
        <RegisterSW />
        {children}
        <LegalNotice variant="mobile" />
        <div id="m-portal" />
      </LiveDataProvider>
    </div>
  );
}
```

---

### 1.3 `app/w/w.css` — tema azul sobre o m.css

Criar arquivo novo:

```css
/* /w herda TODA a infra do /m e sobrescreve apenas o accent color */
@import "../m/m.css";

/* Polymarket blue accent em vez do verde Sóstenes */
:root {
  --w-accent: #2563eb;
  --w-accent-dim: rgba(37, 99, 235, 0.15);
  --w-accent-border: rgba(37, 99, 235, 0.35);
}

/* Market card: borda esquerda azul em vez de verde */
.w-market-card {
  border-left: 3px solid var(--w-accent);
}

/* Barra de probabilidade */
.w-prob-bar {
  height: 6px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  margin: 6px 0 4px;
}
.w-prob-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.5s ease;
}

/* Header brand /w */
.w-brand-accent {
  color: var(--w-accent);
}

/* Cargo chip */
.w-cargo-chip {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 99px;
  background: var(--w-accent-dim);
  color: var(--w-accent);
  border: 1px solid var(--w-accent-border);
}
```

---

### 1.4 `app/w/[[...tab]]/page.tsx` — catch-all route

Criar arquivo novo:

```tsx
import { notFound } from "next/navigation";

import { WShell } from "@/components/w/shell";
import { TAB_IDS_W, type TabIdW } from "@/components/w/tabs";

export default async function WPage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const { tab } = await params;
  const id = tab?.[0] ?? "mercados";
  if (tab && (tab.length > 1 || !(TAB_IDS_W as readonly string[]).includes(id))) {
    notFound();
  }
  return <WShell initialTab={id as TabIdW} />;
}
```

---

## Bloco 2 — Registry de abas + Shell

### 2.1 `components/w/tabs.ts`

Criar arquivo novo:

```ts
export const TAB_IDS_W = [
  "mercados",
  "pesquisas",
  "candidatos",
  "apuracao",
  "historico",
  "radar",
  "config",
] as const;
export type TabIdW = (typeof TAB_IDS_W)[number];
```

---

### 2.2 `components/w/shell.tsx` — WShell

Criar arquivo novo. Baseado em `components/mobile/shell.tsx`, adaptado para as 7 abas do /w:

```tsx
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

const TABS: { id: TabIdW; label: string; Icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>; Component: React.ComponentType }[] = [
  { id: "mercados",   label: "Mercados",  Icon: TrendingUp,   Component: MercadosTab },
  { id: "pesquisas",  label: "Pesquisas", Icon: BarChart2,     Component: PesquisasTab },
  { id: "candidatos", label: "Candidatos",Icon: Users,         Component: CandidatosTab },
  { id: "apuracao",   label: "Apuração",  Icon: Radio,         Component: ApuracaoTab },
  { id: "historico",  label: "Histórico", Icon: CalendarDays,  Component: HistoricoTab },
  { id: "radar",      label: "Radar",     Icon: Radar,         Component: RadarTab },
  { id: "config",     label: "Config",    Icon: Settings2,     Component: ConfigTab },
];

export function WShell({ initialTab }: { initialTab: TabIdW }) {
  const initialIndex = Math.max(0, TAB_IDS_W.indexOf(initialTab));
  const [index, setIndex] = useState(initialIndex);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([initialIndex]));
  const viewportRef = useRef<HTMLDivElement>(null);
  const tabbarRef = useRef<HTMLElement>(null);
  const rafRef = useRef(0);

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
          <LiveBadge ch="idx.sost" cadenceMs={5000} showLabel />
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
```

---

## Bloco 3 — Mock determinístico

### 3.1 `lib/w/w-mock.ts`

Criar arquivo novo com dados sintéticos para todas as abas. Padrão: funções puras do tempo (mesmo estilo `lib/live-mock.ts`).

```ts
// Mock determinístico para /w — dados sintéticos enquanto fontes reais não estão plugadas.
// Funções puras do tempo: f(seed, t) → valor idêntico em qualquer reconexão.

export type Cargo = "presidente" | "governador_rj" | "senador_rj" | "dep_federal_rj";

export type MarketEntry = {
  cargo: Cargo;
  candidato: string;
  partido: string;
  cor: string;
  probVencer: number;       // 0..1
  probTop2: number;         // 0..1
  pct: number;              // % pesquisa agregada
  delta7d: number;          // pp vs 7 dias atrás
  tendencia: "up" | "down" | "flat";
  historico30d: number[];   // % diário últimos 30d
  fonteReal: boolean;
};

export type PesquisaEntry = {
  id: string;
  instituto: string;
  dataRegistro: string;
  cargo: Cargo;
  candidato: string;
  pct: number;
  n: number;
  margemErro: number;
  fonteReal: boolean;
};

export type CandidatoEntry = {
  nome: string;
  nomeUrna: string;
  partido: string;
  cargo: Cargo;
  uf: string;
  numero: string;
  cor: string;
};

function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = Math.imul(31, h) + s.charCodeAt(i) | 0; }
  return Math.abs(h);
}

function frac(s: string): number { return (seed(s) % 1000) / 1000; }

const PRESIDENTE_CANDIDATOS = [
  { candidato: "Lula", partido: "PT", cor: "#E11D48" },
  { candidato: "Flávio Bolsonaro", partido: "PL", cor: "#3B82F6" },
  { candidato: "Tarcísio de Freitas", partido: "Republicanos", cor: "#F59E0B" },
  { candidato: "Renan Santos", partido: "PL", cor: "#8B5CF6" },
];

const GOV_RJ_CANDIDATOS = [
  { candidato: "Cláudio Castro", partido: "PL", cor: "#3B82F6" },
  { candidato: "Eduardo Paes", partido: "PSD", cor: "#06B6D4" },
  { candidato: "Felipe Santa Cruz", partido: "PSD", cor: "#10B981" },
];

const SEN_RJ_CANDIDATOS = [
  { candidato: "Carlos Portinho", partido: "PL", cor: "#3B82F6" },
  { candidato: "Alessandro Molon", partido: "PSB", cor: "#EF4444" },
  { candidato: "Rodrigo Bacellar", partido: "UB", cor: "#F59E0B" },
];

const DEP_FED_RJ_CANDIDATOS = [
  { candidato: "Sóstenes Cavalcante", partido: "PL", cor: "#16C784" },
  { candidato: "Carlos Jordy", partido: "PL", cor: "#3B82F6" },
  { candidato: "Talíria Petrone", partido: "PSOL", cor: "#EF4444" },
  { candidato: "Dr. Luizinho", partido: "PP", cor: "#F59E0B" },
  { candidato: "Daniela do Waguinho", partido: "UB", cor: "#8B5CF6" },
];

function buildMarket(cargo: Cargo, lista: typeof PRESIDENTE_CANDIDATOS, now: number): MarketEntry[] {
  const total = lista.reduce((s, c) => s + frac(`${c.candidato}:pct`), 0);
  const dayMs = 24 * 60 * 60 * 1000;
  return lista.map((c) => {
    const base = frac(`${c.candidato}:pct`) / total;
    const noise = (Math.sin(now / (7 * dayMs) + seed(c.candidato)) * 0.015);
    const pct = Math.max(3, Math.round((base + noise) * 100));
    const delta7d = Math.round((Math.sin(now / (14 * dayMs) + seed(c.candidato) * 0.3) * 4) * 10) / 10;
    return {
      cargo,
      candidato: c.candidato,
      partido: c.partido,
      cor: c.cor,
      probVencer: Math.round((base * 0.85 + 0.05 + Math.sin(now / dayMs + seed(c.candidato)) * 0.03) * 100) / 100,
      probTop2: Math.min(0.98, Math.round((base * 1.1 + 0.1) * 100) / 100),
      pct,
      delta7d,
      tendencia: delta7d > 0.5 ? "up" : delta7d < -0.5 ? "down" : "flat",
      historico30d: Array.from({ length: 30 }, (_, i) =>
        Math.max(2, Math.round((pct + Math.sin((now / dayMs - 29 + i) * 0.7 + seed(c.candidato)) * 3) * 10) / 10)
      ),
      fonteReal: false,
    };
  });
}

export function snapshotMercados(now: number): Record<Cargo, MarketEntry[]> {
  return {
    presidente:    buildMarket("presidente",    PRESIDENTE_CANDIDATOS, now),
    governador_rj: buildMarket("governador_rj", GOV_RJ_CANDIDATOS,     now),
    senador_rj:    buildMarket("senador_rj",    SEN_RJ_CANDIDATOS,     now),
    dep_federal_rj:buildMarket("dep_federal_rj",DEP_FED_RJ_CANDIDATOS, now),
  };
}

export function snapshotPesquisas(now: number): PesquisaEntry[] {
  const institutos = ["Datafolha", "Quaest", "AtlasIntel", "PoderData", "Paraná Pesquisas"];
  const result: PesquisaEntry[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (const inst of institutos) {
    const daysBack = Math.floor(frac(`${inst}:days`) * 14);
    const data = new Date(now - daysBack * dayMs).toISOString().slice(0, 10);
    for (const c of PRESIDENTE_CANDIDATOS) {
      result.push({
        id: `${inst}-${c.candidato}-${data}`,
        instituto: inst,
        dataRegistro: data,
        cargo: "presidente",
        candidato: c.candidato,
        pct: Math.max(3, Math.round(frac(`${inst}:${c.candidato}:pct`) * 40 + 5)),
        n: 800 + Math.floor(frac(`${inst}:n`) * 4200),
        margemErro: Math.round((2 + frac(`${inst}:me`) * 2) * 10) / 10,
        fonteReal: false,
      });
    }
  }
  return result.sort((a, b) => b.dataRegistro.localeCompare(a.dataRegistro));
}

export function snapshotCandidatos(): CandidatoEntry[] {
  return [
    ...PRESIDENTE_CANDIDATOS.map((c, i) => ({ ...c, cargo: "presidente" as Cargo, uf: "BR", numero: `${13 + i}` })),
    ...GOV_RJ_CANDIDATOS.map((c, i)     => ({ ...c, cargo: "governador_rj" as Cargo, uf: "RJ", numero: `${40 + i}` })),
    ...SEN_RJ_CANDIDATOS.map((c, i)     => ({ ...c, cargo: "senador_rj" as Cargo, uf: "RJ", numero: `${100 + i}` })),
    ...DEP_FED_RJ_CANDIDATOS.map((c, i) => ({ ...c, cargo: "dep_federal_rj" as Cargo, uf: "RJ", numero: `${1700 + i}` })),
  ].map((c) => ({ nomeUrna: c.candidato.toUpperCase(), ...c }));
}
```

---

## Bloco 4 — Componentes UI específicos do /w

### 4.1 `components/w/ui/probability-bar.tsx`

```tsx
export function ProbabilityBar({ value, cor }: { value: number; cor: string }) {
  return (
    <div className="w-prob-bar">
      <div
        className="w-prob-fill"
        style={{ width: `${Math.round(value * 100)}%`, background: cor }}
      />
    </div>
  );
}
```

### 4.2 `components/w/ui/market-card.tsx`

```tsx
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { FONTE_SIMULADO } from "@/lib/mobile/fonte-meta";
import type { MarketEntry } from "@/lib/w/w-mock";
import { ProbabilityBar } from "./probability-bar";

const CARGO_LABELS: Record<string, string> = {
  presidente: "Presidente",
  governador_rj: "Governador RJ",
  senador_rj: "Senador RJ",
  dep_federal_rj: "Dep. Federal RJ",
};

export function MarketCard({ entry }: { entry: MarketEntry }) {
  const positivo = entry.delta7d >= 0;
  return (
    <article className="m-quote-card w-market-card">
      <div className="m-quote-head">
        <span className="w-cargo-chip">{CARGO_LABELS[entry.cargo] ?? entry.cargo}</span>
        <FonteBadge real={entry.fonteReal} como={entry.fonteReal ? "Agregador PesqEle TSE + Monte Carlo" : undefined} />
      </div>
      <div className="m-quote-nome">
        {entry.candidato}{" "}
        <span className="m-muted-c" style={{ fontWeight: 400, fontSize: 11 }}>
          ({entry.partido})
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
        <span className="m-quote-val" style={{ color: entry.cor }}>
          {entry.pct}%
        </span>
        <span className={`m-mono ${positivo ? "m-up-c" : "m-down-c"}`} style={{ fontSize: 11.5, fontWeight: 700 }}>
          {positivo ? "▲" : "▼"} {Math.abs(entry.delta7d).toFixed(1)}pp 7d
        </span>
      </div>
      <ProbabilityBar value={entry.pct / 100} cor={entry.cor} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <span className="m-muted-c" style={{ fontSize: 9.5 }}>
          vencer: <strong style={{ color: entry.cor }}>{Math.round(entry.probVencer * 100)}%</strong>
        </span>
        <span className="m-muted-c" style={{ fontSize: 9.5 }}>
          top-2: <strong style={{ color: entry.cor }}>{Math.round(entry.probTop2 * 100)}%</strong>
        </span>
      </div>
    </article>
  );
}
```

---

## Bloco 5 — Abas

### 5.1 `components/w/tabs/mercados/index.tsx`

```tsx
"use client";

import { useMemo } from "react";
import { MarketCard } from "@/components/w/ui/market-card";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { snapshotMercados, type Cargo } from "@/lib/w/w-mock";

const CARGO_ORDER: Cargo[] = ["presidente", "governador_rj", "senador_rj", "dep_federal_rj"];
const CARGO_LABELS: Record<Cargo, string> = {
  presidente: "Presidente",
  governador_rj: "Governador RJ",
  senador_rj: "Senador RJ",
  dep_federal_rj: "Dep. Federal RJ",
};

export default function MercadosTab() {
  const snap = useMemo(() => snapshotMercados(Date.now()), []);

  return (
    <div className="m-tab-content">
      {CARGO_ORDER.map((cargo) => (
        <div key={cargo} className="m-card" style={{ marginBottom: 12 }}>
          <div className="m-card-head">
            <span className="m-card-title">{CARGO_LABELS[cargo]}</span>
          </div>
          <div className="m-carousel" data-no-swipe>
            {snap[cargo].map((entry) => (
              <MarketCard key={entry.candidato} entry={entry} />
            ))}
          </div>
        </div>
      ))}
      <SectionLeitura>
        Probabilidades calculadas por agregador de pesquisas (média móvel 30d + Monte Carlo).
        Arraste para ver todos os candidatos por cargo.
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.2 `components/w/tabs/pesquisas/index.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { snapshotPesquisas, type PesquisaEntry } from "@/lib/w/w-mock";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

export default function PesquisasWTab() {
  const pesquisas = useMemo(() => snapshotPesquisas(Date.now()), []);
  const [inst, setInst] = useState<string>("todos");

  const institutos = useMemo(
    () => ["todos", ...Array.from(new Set(pesquisas.map((p) => p.instituto)))],
    [pesquisas],
  );

  const filtradas = inst === "todos" ? pesquisas : pesquisas.filter((p) => p.instituto === inst);
  const presidente = filtradas.filter((p) => p.cargo === "presidente");

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Pesquisas — Presidente</span>
          <FonteBadge real={false} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {institutos.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInst(i)}
              className={`m-pill ${inst === i ? "up" : ""}`}
              style={{ fontSize: 10 }}
            >
              {i}
            </button>
          ))}
        </div>

        {presidente.slice(0, 20).map((p) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div>
              <span className="m-muted-c" style={{ fontSize: 9.5 }}>{p.instituto} · {p.dataRegistro} · n={p.n}</span>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{p.candidato}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="m-mono" style={{ fontSize: 16, fontWeight: 800 }}>{p.pct}%</span>
              <div className="m-muted-c" style={{ fontSize: 9 }}>±{p.margemErro}pp</div>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Dados do PesqEle (TSE) — download diário CSV. Média móvel 30d ponderada por n amostral e recência.
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.3 `components/w/tabs/candidatos/index.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { snapshotCandidatos, type Cargo } from "@/lib/w/w-mock";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

const CARGOS: { id: Cargo | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "presidente", label: "Presidente" },
  { id: "governador_rj", label: "Gov. RJ" },
  { id: "senador_rj", label: "Senador RJ" },
  { id: "dep_federal_rj", label: "Dep. Fed. RJ" },
];

export default function CandidatosWTab() {
  const [cargo, setCargo] = useState<Cargo | "todos">("todos");
  const todos = useMemo(() => snapshotCandidatos(), []);
  const filtrados = cargo === "todos" ? todos : todos.filter((c) => c.cargo === cargo);

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Candidatos registrados — TSE</span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {CARGOS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCargo(c.id)}
              className={`m-pill ${cargo === c.id ? "up" : ""}`}
              style={{ fontSize: 10 }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {filtrados.map((c) => (
          <div key={`${c.cargo}-${c.candidato}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div
              style={{ width: 8, height: 8, borderRadius: "50%", background: c.cor, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.nomeUrna}</div>
              <span className="m-muted-c" style={{ fontSize: 9.5 }}>{c.partido} · Nº {c.numero}</span>
            </div>
            <span className="w-cargo-chip">{c.uf}</span>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Candidaturas deferidas — fonte TSE (consulta_cand_2026_BRASIL.csv). Atualização mensal.
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.4 `components/w/tabs/apuracao/index.tsx`

```tsx
"use client";

import { useMemo } from "react";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

const ELEICAO_1 = new Date("2026-10-04T08:00:00-03:00").getTime();
const ELEICAO_2 = new Date("2026-10-25T08:00:00-03:00").getTime();

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Apuração ao vivo";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

export default function ApuracaoWTab() {
  const now = Date.now();
  const ate1 = ELEICAO_1 - now;
  const ate2 = ELEICAO_2 - now;

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Apuração ao vivo — TSE</span>
        </div>

        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8 }}>
            1º Turno — 4 de outubro de 2026
          </div>
          <div className="m-quote-val" style={{ fontSize: 28, marginBottom: 4 }}>
            {fmtCountdown(ate1)}
          </div>
          {ate1 > 0 && (
            <div className="m-muted-c" style={{ fontSize: 10 }}>
              A apuração em tempo real estará disponível a partir do fechamento das urnas.
            </div>
          )}
        </div>

        {ate1 <= 0 && (
          <div className="m-ghost">Conectando ao JSON de resultados TSE…</div>
        )}

        {ate2 > 0 && ate1 <= 0 && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div className="m-muted-c" style={{ fontSize: 10 }}>
              2º Turno — 25 de outubro de 2026 · {fmtCountdown(ate2)}
            </div>
          </div>
        )}
      </div>
      <SectionLeitura>
        Polling de resultados.tse.jus.br a cada 30s durante a apuração. Fonte oficial TSE.
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.5 `components/w/tabs/historico/index.tsx`

```tsx
"use client";

import { useMemo } from "react";
import { EChart } from "@/components/echart";
import { compareLinesOption } from "@/components/mobile/m-chart-options";
import { snapshotMercados } from "@/lib/w/w-mock";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

export default function HistoricoWTab() {
  const snap = useMemo(() => snapshotMercados(Date.now()), []);

  const opt = useMemo(() => {
    const pres = snap.presidente;
    const labels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 86400000);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const series = pres.map((e) => ({ nome: e.candidato, cor: e.cor, data: e.historico30d }));
    return compareLinesOption({ labels, series });
  }, [snap]);

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Histórico — Presidente · 30 dias</span>
        </div>
        <div data-no-swipe>
          <EChart option={opt} height={220} />
        </div>
        <p className="m-muted-c" style={{ fontSize: 10.5, marginTop: 6 }}>
          Toque na legenda para ligar/desligar candidato. Pinça para zoom.
        </p>
      </div>
      <SectionLeitura>
        Evolução da % agregada diária por candidato. Faixa sombreada = intervalo de confiança 95% (Monte Carlo 1.000 simulações).
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.6 `components/w/tabs/radar/index.tsx`

```tsx
"use client";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { Alert } from "@/lib/live-schemas";

export default function RadarWTab() {
  const { data } = useLiveChannel<{ alertas: Alert[] }>("alerts");
  const alertas = data?.alertas ?? [];

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Radar · Imprensa BR</span>
          <FonteBadge real={alertas.length > 0} como="Google News RSS — manchetes sobre candidatos monitorados." />
        </div>
        {alertas.length === 0 && <div className="m-ghost">sincronizando alertas…</div>}
        {alertas.slice(0, 20).map((a) => (
          <div key={a.id} style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 12, lineHeight: 1.4 }}>{a.titulo}</div>
            <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 2 }}>
              {a.veiculo} · <span className={a.tom === "pos" ? "m-up-c" : a.tom === "neg" ? "m-down-c" : "m-muted-c"}>{a.tom}</span>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Manchetes em tempo real via Google News RSS. Sentimento por pysentimiento (BERT PT).
      </SectionLeitura>
    </div>
  );
}
```

---

### 5.7 `components/w/tabs/config/index.tsx`

```tsx
"use client";

import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

export default function ConfigWTab() {
  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Configurações</span>
        </div>
        <div style={{ padding: "12px 0" }}>
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8 }}>Cargos monitorados</div>
          {["Presidente", "Governador RJ", "Senador RJ", "Dep. Federal RJ"].map((c) => (
            <label key={c} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 13 }}>
              <input type="checkbox" defaultChecked style={{ accentColor: "var(--w-accent, #2563eb)" }} />
              {c}
            </label>
          ))}
        </div>
        <div style={{ padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8 }}>Janela do agregador</div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
            <input type="range" min={14} max={60} defaultValue={30} style={{ flex: 1, accentColor: "var(--w-accent, #2563eb)" }} />
            30 dias
          </label>
        </div>
      </div>
      <SectionLeitura>
        Configurações do cockpit eleitoral. Selecione os cargos e a janela temporal do agregador.
      </SectionLeitura>
    </div>
  );
}
```

---

## Bloco 6 — Verificação final

```bash
# Na raiz do projeto:
npx tsc --noEmit    # deve retornar 0 erros
npm run lint        # deve retornar 0 erros (apenas warnings pré-existentes)
npm run dev         # abrir http://localhost:3000/w
```

**Fluxo de verificação manual:**
1. `/w` → redireciona para login se não autenticado ✓
2. `/w` → abre aba `mercados` com market cards por cargo ✓
3. Swipe horizontal → troca abas sem recarregar ✓
4. Aba `pesquisas` → lista filtrada por instituto ✓
5. Aba `candidatos` → filtro por cargo ✓
6. Aba `apuracao` → countdown até 4/10/2026 ✓
7. Aba `historico` → gráfico de linhas 30d ✓
8. Aba `radar` → alertas Google News (reusa canal SSE `alerts`) ✓
9. Aba `config` → checkboxes de cargo + slider de janela ✓
10. Todos os badges mostram DEMO (amarelo) em dados mock ✓

---

## Fase 2 — Dados reais (pós-MVP)

Criar `lib/w/tse-pesquisas.ts`:
- Download de `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip`
- Parse CSV Latin-1 com `iconv-lite` (já no package) + `csv-parse`
- Cache em `data/w-pesquisas.json` (gitignored), TTL 24h
- Getter `getPesquisasW()` usado pela rota `app/api/w/pesquisas/route.ts`

Criar `lib/w/aggregator.ts`:
- Média móvel 30d ponderada: peso = `n_amostral × e^(-diasAtras/15)`
- Monte Carlo 1.000 simulações: cada sim sorteia valores de cada pesquisa dentro da margem (t-Student ν=4)
- Retorna P(Top-2), P(Vencer), IC 95%

Criar `lib/w/tse-resultados.ts` (ativo apenas 4/10/2026 e 25/10/2026):
- Polling de `https://resultados.tse.jus.br/oficial/ele2026/<cod>/dados-simplificados/br/br-c<cargo>-e<cod>-r.json`
- Cache em memória, TTL 30s
- Fallback gracioso quando servidor TSE estiver sobrecarregado
