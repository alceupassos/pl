"use client";

import Script from "next/script";
import {
  LogOut,
  Menu,
  LayoutDashboard,
  Radar,
  BarChart3,
  Target,
  RadioTower,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { candidateDetails, pageTitles } from "@/components/campaign-data";
import {
  renderSectionCharts,
  updateSectionCharts,
} from "@/components/campaign-charts";
import {
  navigationGroups,
  refreshableSections,
} from "@/components/campaign-config";
import { buildSectionHtml } from "@/components/section-html";
import { CandidateDetail } from "@/components/candidate-detail";
import { CampaignDownloads } from "@/components/campaign-downloads";
import { ComunicacaoSection } from "@/components/sections/comunicacao-section";
import { CrmSection } from "@/components/sections/crm-section";
import { AgendaSection } from "@/components/sections/agenda-section";
import { DiarioSection } from "@/components/sections/diario-section";
import { NocSection } from "@/components/sections/noc-section";
import { PlenarioSection } from "@/components/sections/plenario-section";
import { RaioxSection } from "@/components/sections/raiox-section";
import { MetaSection } from "@/components/sections/meta-section";
import { PesquisasSection } from "@/components/sections/pesquisas-section";
import { OrganizadoresSection } from "@/components/sections/organizadores-section";
import { SocialSection } from "@/components/sections/social-section";
import { TerritoriosSection } from "@/components/sections/territorios-section";
import { DashboardSection } from "@/components/sections/dashboard-section";
import { InfluenciadoresSection } from "@/components/sections/influenciadores-section";
import { CandidatosSection } from "@/components/sections/candidatos-section";
import { MidiaSection } from "@/components/sections/midia-section";
import { PostsSection } from "@/components/sections/posts-section";
import { RegionFilter } from "@/components/sections/region-filter";
import { TopTicker } from "@/components/top-ticker";
import { WebCommandHeader } from "@/components/sections/web-command-header";
import { WebCommandOverview } from "@/components/sections/web-command-overview";
import { WebSectionFrame } from "@/components/sections/web-section-frame";
import { ConfigPanel } from "@/components/sections/config-panel";
import { LoginScreen } from "@/components/login-screen";
import { calcularQuociente, projetarBancada } from "@/lib/quociente";
import type { RegionId } from "@/lib/mock/types";

// Seções renderizadas como componentes React (não HTML em string).
const REACT_SECTIONS = new Set([
  "candidato-detalhe",
  "downloads",
  "comunicacao",
  "crm",
  "eventos",
  "diario",
  "noc",
  "plenario",
  "raiox",
  "meta",
  "pesquisas",
  "organizadores",
  "social",
  "territorios",
  "dashboard",
  "influenciadores",
  "candidatos",
  "midia",
  "posts",
]);

declare global {
  interface Window {
    lucide?: { createIcons: () => void };
  }
}

type SectionId = keyof typeof pageTitles;
type CandidateKey = keyof typeof candidateDetails;

const SKIP_SECTION_FRAME = new Set<SectionId>([
  "dashboard",
  "candidato-detalhe",
  "downloads",
]);

const DEFAULT_SECTION: SectionId = "dashboard";
const DEFAULT_CANDIDATE: CandidateKey = "renato_araujo";

function formatLastUpdate() {
  const now = new Date();
  return `${now.toLocaleDateString("pt-BR")} · ${now.toLocaleTimeString(
    "pt-BR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  )}`;
}

function updateCountdownElement() {
  const element = document.getElementById("countdown_dias");
  if (!element) return;

  const electionDay = new Date("2026-10-04T00:00:00");
  const now = new Date();
  const diff = Math.ceil(
    (electionDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  element.textContent = String(Math.max(0, diff));
}

function syncCalculatorOutputs() {
  const eleitores = Number(
    (document.getElementById("inp_eleitores") as HTMLInputElement | null)
      ?.value || 12420000,
  );
  const comp =
    Number(
      (document.getElementById("inp_comp") as HTMLInputElement | null)?.value ||
        74,
    ) / 100;
  const invalidos =
    Number(
      (document.getElementById("inp_invalidos") as HTMLInputElement | null)
        ?.value || 10,
    ) / 100;
  const vagas = Number(
    (document.getElementById("inp_vagas") as HTMLInputElement | null)?.value ||
      46,
  );
  const margem =
    Number(
      (document.getElementById("inp_margem") as HTMLInputElement | null)
        ?.value || 15,
    ) / 100;
  // Matemática extraída para lib/quociente.ts (compartilhada com a aba
  // "2026" do /m); esta função segue sendo só a cola DOM da seção.
  const { coeficiente: coef, metaVotos: meta } = calcularQuociente({
    eleitores,
    comparecimento: comp,
    invalidos,
    vagas,
    margem,
  });

  const resCoef = document.getElementById("res_coef");
  const resMeta = document.getElementById("res_meta");
  if (resCoef) resCoef.textContent = coef.toLocaleString("pt-BR");
  if (resMeta) resMeta.textContent = meta.toLocaleString("pt-BR");

  const renato = Number(
    (document.getElementById("inp_renato") as HTMLInputElement | null)?.value ||
      45000,
  );
  const plTotal = Number(
    (document.getElementById("inp_pl_total") as HTMLInputElement | null)
      ?.value || 1840000,
  );
  const plCands = Number(
    (document.getElementById("inp_pl_cands") as HTMLInputElement | null)
      ?.value || 28,
  );
  const vagasPl = projetarBancada({ votosLegenda: plTotal, quociente: coef }).base;
  const pct = ((renato / plTotal) * 100).toFixed(1);
  const pos = Math.ceil((plTotal / plCands / renato) * (plCands * 0.3));

  const resVagasPl = document.getElementById("res_vagas_pl");
  const resPctRenato = document.getElementById("res_pct_renato");
  const resPosPl = document.getElementById("res_pos_pl");
  const resRankPl = document.getElementById("res_rank_pl");

  if (resVagasPl) resVagasPl.textContent = String(vagasPl);
  if (resPctRenato) resPctRenato.textContent = `${pct}%`;
  if (resPosPl) resPosPl.textContent = renato.toLocaleString("pt-BR");
  if (resRankPl) {
    resRankPl.textContent =
      pos <= 3 ? "3° mais votados" : pos <= 5 ? "5 primeiros" : "top 10";
  }
}

async function handleLogout(
  setAuthStatus: (s: "checking" | "guest" | "authenticated") => void,
  setOpenLoginOnGuest: (b: boolean) => void,
) {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
  setAuthStatus("guest");
  setOpenLoginOnGuest(true);
}

export function CampaignCockpit() {
  const [authStatus, setAuthStatus] = useState<
    "checking" | "guest" | "authenticated"
  >("checking");
  const [activeSection, setActiveSection] =
    useState<SectionId>(DEFAULT_SECTION);
  const [selectedCandidateKey, setSelectedCandidateKey] =
    useState<CandidateKey>(DEFAULT_CANDIDATE);
  const [lastUpdate, setLastUpdate] = useState("—");
  const [refreshTick, setRefreshTick] = useState(0);
  const [liveTick, setLiveTick] = useState(0);
  const [openLoginOnGuest, setOpenLoginOnGuest] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [activeRegion, setActiveRegion] = useState<RegionId>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const sectionHostRef = useRef<HTMLDivElement>(null);

  const titlePair = pageTitles[activeSection] ?? pageTitles.dashboard;
  const activeMarkup = useMemo(() => {
    if (REACT_SECTIONS.has(activeSection)) return null;
    return buildSectionHtml(activeSection, activeRegion);
  }, [activeSection, activeRegion]);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
        });
        setAuthStatus(response.ok ? "authenticated" : "guest");
      } catch {
        setAuthStatus("guest");
      }
    };

    void verifySession();
  }, []);

  useEffect(() => {
    window.setTimeout(() => {
      setLastUpdate(formatLastUpdate());
    }, 0);

    const interval = window.setInterval(() => {
      setLastUpdate(formatLastUpdate());
      updateCountdownElement();
    }, 60000);

    updateCountdownElement();

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    void fetch("/api/access-log", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "cockpit_section_view",
        path: `/#${activeSection}`,
        metadata: {
          section: activeSection,
        },
      }),
      keepalive: true,
    }).catch(() => undefined);

    const app = document.getElementById("app");
    if (app) app.classList.add("logado");

    window.setTimeout(() => {
      window.lucide?.createIcons();
      updateCountdownElement();
      if (refreshableSections.has(activeSection)) {
        renderSectionCharts(activeSection, activeRegion);
        // Carimbo inicial — sem ele os cards mostrariam "agora" até o 1º tick.
        const stamp = new Date().toLocaleTimeString("pt-BR");
        document.querySelectorAll("[data-live-updated]").forEach((element) => {
          element.textContent = stamp;
        });
      }
      if (activeSection === "calculadora") {
        syncCalculatorOutputs();
      }
    }, 50);

    return () => {
      if (app) app.classList.remove("logado");
    };
  }, [authStatus, activeSection, activeRegion, refreshTick]);

  // Tick do monitor vivo — só roda em seções com gráficos Chart.js (a
  // dashboard tem o próprio tick) e pausa com a aba em segundo plano. O
  // carimbo "atualizado às" dos cards HTML é escrito direto no DOM
  // (sobrevive ao tick porque o markup não é reinjetado).
  useEffect(() => {
    if (authStatus !== "authenticated") return;
    if (!refreshableSections.has(activeSection)) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setLiveTick((value) => value + 1);
      setLastUpdate(formatLastUpdate());
      const stamp = new Date().toLocaleTimeString("pt-BR");
      document.querySelectorAll("[data-live-updated]").forEach((element) => {
        element.textContent = stamp;
      });
    }, 20000);
    return () => window.clearInterval(interval);
  }, [authStatus, activeSection]);

  // Atualiza os gráficos em vigor sem destruí-los (transição animada).
  // Separado do efeito principal acima, que faz destrói-e-recria via
  // renderSectionCharts.
  useEffect(() => {
    if (authStatus !== "authenticated" || liveTick === 0) return;
    if (refreshableSections.has(activeSection)) {
      updateSectionCharts(activeSection, activeRegion, liveTick);
    }
    // Intencionalmente disparado só pelo tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTick]);

  // Ao trocar de seção, volta ao topo (mobile rola o documento; desktop rola #content).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    sectionHostRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [activeSection]);

  useEffect(() => {
    const host = sectionHostRef.current;
    if (!host) return;

    if (activeSection === "calculadora") {
      const inputs = host.querySelectorAll<HTMLInputElement>(".calc-input");
      const onInput = () => syncCalculatorOutputs();
      inputs.forEach((input) => input.addEventListener("input", onInput));
      syncCalculatorOutputs();

      return () => {
        inputs.forEach((input) => input.removeEventListener("input", onInput));
      };
    }

    if (activeSection === "candidatos") {
      host.querySelectorAll<HTMLElement>(".cand-card").forEach((card) => {
        card.classList.toggle(
          "active-detail",
          card.dataset.candidateKey === selectedCandidateKey,
        );
      });
    }
  }, [activeSection, selectedCandidateKey, refreshTick]);

  useEffect(() => {
    const host = sectionHostRef.current;
    if (!host) return;

    const openCandidate = (candidateKey?: string) => {
      if (!candidateKey || !(candidateKey in candidateDetails)) return;
      setSelectedCandidateKey(candidateKey as CandidateKey);
      setActiveSection("candidato-detalhe");
    };

    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const candidateTrigger = target?.closest<HTMLElement>(
        "[data-candidate-key]",
      );
      if (candidateTrigger) {
        openCandidate(candidateTrigger.dataset.candidateKey);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target as HTMLElement | null;
      const candidateTrigger = target?.closest<HTMLElement>(
        "[data-candidate-key]",
      );
      if (candidateTrigger) {
        event.preventDefault();
        openCandidate(candidateTrigger.dataset.candidateKey);
      }
    };

    host.addEventListener("click", onClick);
    host.addEventListener("keydown", onKeyDown);

    return () => {
      host.removeEventListener("click", onClick);
      host.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSection]);

  return (
    <>
      <Script
        src="https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js"
        strategy="afterInteractive"
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      <div className={`logout-overlay ${showLogoutModal ? "visible" : ""}`}>
        <div className="logout-modal">
          <div className="logout-icon-wrap">
            <LogOut size={32} />
          </div>
          <h3 className="logout-title">Deseja sair do Cockpit?</h3>
          <p className="logout-text">
            Sua sessão será encerrada com total segurança.
          </p>
          <div className="logout-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowLogoutModal(false)}
              type="button"
            >
              CANCELAR
            </button>
            <button
              className="btn-confirm-logout"
              onClick={() => {
                setShowLogoutModal(false);
                void handleLogout(setAuthStatus, setOpenLoginOnGuest);
              }}
              type="button"
            >
              SAIR AGORA
            </button>
          </div>
        </div>
      </div>

      {authStatus !== "authenticated" ? (
        <LoginScreen
          onLogin={() => {
            setAuthStatus("authenticated");
            setOpenLoginOnGuest(false);
          }}
          defaultOpen={openLoginOnGuest}
        />
      ) : null}

      <div
        id="app"
        className={
          `${authStatus === "authenticated" ? "logado" : ""} ${sidebarOpen ? "sidebar-open" : ""}`.trim() ||
          undefined
        }
      >
        <div
          className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <div id="sidebar">
          <div className="logo-area">
            <div className="logo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="logo-img"
                src="sostenesfundoescuro.png"
                alt="Sostenes"
              />
            </div>
            <div className="logo-photo-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="logo-photo"
                src="sostenes10.png"
                alt="Foto principal do candidato"
              />
            </div>
            <div className="versao">Cockpit v3.0 · 2026</div>
          </div>

          {navigationGroups.map((group) => (
            <div className="nav-section" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  className={`nav-item ${activeSection === item.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id as SectionId);
                    setRefreshTick((t) => t + 1);
                    setSidebarOpen(false);
                  }}
                  type="button"
                >
                  <span className="nav-icon">
                    <i data-lucide={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}

          <div style={{ marginTop: "auto", padding: "16px" }}>
            <button
              className="nav-item logout-btn premium-btn logout-btn-premium"
              onClick={() => setShowLogoutModal(true)}
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span className="nav-icon">
                <LogOut size={16} />
              </span>
              <span>Sair do Cockpit</span>
            </button>
          </div>

          <div className="sidebar-footer">
            <div className="sf-label">Última atualização</div>
            <div className="sf-val" id="lastUpdate" suppressHydrationWarning>
              {lastUpdate}
            </div>
          </div>
        </div>

        <div id="main">
          <TopTicker region={activeRegion} />
          <WebCommandHeader />
          {activeSection === "dashboard" ? (
            <WebCommandOverview
              region={activeRegion}
              onNavigate={(section) => {
                setActiveSection(section as SectionId);
                setSidebarOpen(false);
                setRefreshTick((value) => value + 1);
              }}
            />
          ) : null}
          <ConfigPanel open={showConfig} onClose={() => setShowConfig(false)} />
          <div id="topbar">
            <div className="topbar-left">
              <button
                className="hamburger-btn"
                type="button"
                aria-label="Abrir menu"
                onClick={() => setSidebarOpen((v) => !v)}
              >
                <Menu size={20} />
              </button>
              <div>
                <div className="page-title" id="pageTitle">
                  {titlePair[0]}
                </div>
                <div className="page-sub" id="pageSub">
                  {titlePair[1]}
                </div>
              </div>
            </div>
            <div className="topbar-right">
              <RegionFilter value={activeRegion} onChange={setActiveRegion} />
              <div className="badge-live">
                <div className="dot-live" /> AO VIVO
              </div>
              <button
                className="btn-top icon-btn premium-btn"
                type="button"
                onClick={() => setRefreshTick((value) => value + 1)}
              >
                <span className="top-icon">
                  <i data-lucide="refresh-cw" />
                </span>
                <span>Atualizar</span>
              </button>
              <button
                className="btn-top icon-btn premium-btn"
                type="button"
                onClick={() => setShowConfig(true)}
              >
                <span className="top-icon">
                  <i data-lucide="settings-2" />
                </span>
                <span>Config</span>
              </button>
              <button
                className="btn-top icon-btn btn-logout premium-btn logout-btn-premium shine-effect"
                type="button"
                title="Sair do cockpit"
                aria-label="Sair"
                onClick={() => setShowLogoutModal(true)}
              >
                <span className="top-icon">
                  <LogOut size={15} />
                </span>
                <span>Sair</span>
              </button>
              <div className="avatar">G</div>
            </div>
          </div>

          <div id="content" ref={sectionHostRef}>
            {(() => {
              const sectionBody =
                activeSection === "candidato-detalhe" ? (
                  <CandidateDetail candidateKey={selectedCandidateKey} />
                ) : activeSection === "downloads" ? (
                  <CampaignDownloads />
                ) : activeSection === "comunicacao" ? (
                  <ComunicacaoSection />
                ) : activeSection === "crm" ? (
                  <CrmSection />
                ) : activeSection === "eventos" ? (
                  <AgendaSection />
                ) : activeSection === "diario" ? (
                  <DiarioSection />
                ) : activeSection === "noc" ? (
                  <NocSection
                    region={activeRegion}
                    onRegionChange={setActiveRegion}
                  />
                ) : activeSection === "plenario" ? (
                  <PlenarioSection />
                ) : activeSection === "raiox" ? (
                  <RaioxSection region={activeRegion} />
                ) : activeSection === "meta" ? (
                  <MetaSection region={activeRegion} />
                ) : activeSection === "pesquisas" ? (
                  <PesquisasSection region={activeRegion} />
                ) : activeSection === "organizadores" ? (
                  <OrganizadoresSection
                    region={activeRegion}
                    onRegionChange={setActiveRegion}
                  />
                ) : activeSection === "social" ? (
                  <SocialSection />
                ) : activeSection === "territorios" ? (
                  <TerritoriosSection
                    region={activeRegion}
                    onRegionChange={setActiveRegion}
                  />
                ) : activeSection === "dashboard" ? (
                  <DashboardSection
                    region={activeRegion}
                    onRegionChange={setActiveRegion}
                  />
                ) : activeSection === "influenciadores" ? (
                  <InfluenciadoresSection />
                ) : activeSection === "candidatos" ? (
                  <CandidatosSection />
                ) : activeSection === "midia" ? (
                  <MidiaSection />
                ) : activeSection === "posts" ? (
                  <PostsSection />
                ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: activeMarkup ?? "" }}
                    suppressHydrationWarning
                  />
                );

              if (SKIP_SECTION_FRAME.has(activeSection)) return sectionBody;

              return (
                <WebSectionFrame title={titlePair[0]} subtitle={titlePair[1]}>
                  {sectionBody}
                </WebSectionFrame>
              );
            })()}
            <div
              className="mockup-warning"
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <strong>
                MOCKUP DE MODELO A SER CONSTRUÍDO COM DADOS NÃO REAIS
              </strong>
            </div>
          </div>

          {/* Bottom-nav mobile — mini-NOC de bolso */}
          <nav className="mobile-bottom-nav" aria-label="Navegação rápida">
            {(
              [
                { id: "dashboard", Icon: LayoutDashboard, label: "Painel" },
                { id: "noc", Icon: Radar, label: "NOC" },
                { id: "pesquisas", Icon: BarChart3, label: "Pesquisas" },
                { id: "meta", Icon: Target, label: "Meta" },
                { id: "social", Icon: RadioTower, label: "Redes" },
              ] as { id: SectionId; Icon: LucideIcon; label: string }[]
            ).map(({ id, Icon, label }) => (
              <button
                key={id}
                type="button"
                className={`mbn-item ${activeSection === id ? "active" : ""}`}
                onClick={() => {
                  setActiveSection(id);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={20} aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
