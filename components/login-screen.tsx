"use client";

import "altcha";
import { AmbientVideo } from "@/components/ambient-video";

import { createElement, type FormEvent, type ReactElement, type SVGProps, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  ClipboardCheck,
  DatabaseZap,
  FileCheck2,
  FolderDown,
  Megaphone,
  ShieldCheck,
  Target,
  UsersRound,
  Vote,
  WalletCards,
  MessageCircleMore,
  X,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AltchaWidgetElement = HTMLElement & {
  getState?: () => string;
  reset?: () => void;
};

type IconLike = LucideIcon | ((props: SVGProps<SVGSVGElement>) => ReactElement);


const ALTCHA_WIDGET_ID = "login-altcha-widget";
// Bypass temporário do ALTCHA para testes mobile — espelha DISABLE_ALTCHA do servidor.
const ALTCHA_DISABLED = process.env.NEXT_PUBLIC_DISABLE_ALTCHA === "true";


const WHATSAPP_URL =
  "https://wa.me/5511972322293?text=Olá%2C%20quero%20entender%20a%20assessoria%20política%20estratégica%20e%20o%20SaaS%20de%20campanha.";

type StrategyStep = { step: string; title: string; description: string };

const strategySteps: StrategyStep[] = [
  {
    step: "01",
    title: "Diagnóstico Político de Alta Precisão",
    description:
      "Análise profunda do cenário municipal: histórico eleitoral, mapa de calor de votação por bairro, avaliação de imagem do candidato e identificação de 'vácuos' políticos não preenchidos.",
  },
  {
    step: "02",
    title: "Engenharia de Narrativa e Posicionamento",
    description:
      "Construção da identidade política: definição de tom de voz, pilares de comunicação, causas prioritárias e blindagem de pontos sensíveis. Criação de um 'Brand Book' político único.",
  },
  {
    step: "03",
    title: "Planejamento Matemático de Votos",
    description:
      "Cálculo preciso do coeficiente, metas por seção eleitoral e definição do 'Número Mágico' para vitória, com margem de segurança baseada em dados reais e não em desejos.",
  },
  {
    step: "04",
    title: "Inteligência de Campo e Mobilização",
    description:
      "Treinamento de lideranças, roteirização de caminhadas, gestão de agendas estratégicas e integração total entre a rua e o sistema de monitoramento digital.",
  },
  {
    step: "05",
    title: "Omnichannel Político e Ritmo Digital",
    description:
      "Presença coordenada em WhatsApp, Instagram, Facebook e Google. Calendário editorial de alta frequência focado em conversão de indecisos e retenção de base.",
  },
  {
    step: "06",
    title: "Sala de Situação e Ajuste Dinâmico",
    description:
      "Monitoramento diário de adversários e redes. Reuniões de comando para pivotar a estratégia em tempo real caso surjam fatos novos ou crises imprevistas.",
  },
];

type SaasFeature = { icon: IconLike; title: string; detail: string; badge?: string };

const saasFeatures: SaasFeature[] = [
  {
    icon: Vote,
    title: "Dashboard com pesquisas e intenção de voto",
    detail:
      "Abertura diária com posição atual, evolução por semana, perfil do eleitor favorável, rejeição, indecisos e qualidade dos dados coletados. O candidato e a coordenação enxergam a eleição como ela está, não como imaginam que ela está.",
    badge: "Dados reais",
  },
  {
    icon: Target,
    title: "Territórios, bairros e mapa de força",
    detail:
      "Visualização de força por zona eleitoral e bairro, ranking de competidores por área, evolução semana a semana e alertas de regiões que estão perdendo tração. A coordenação decide para onde ir com base em dado, não em intuição.",
    badge: "Mapa inteligente",
  },
  {
    icon: BrainCircuit,
    title: "IA preditiva e alertas de tendência",
    detail:
      "Motor de inteligência artificial que cruza pesquisas, redes sociais, histórico eleitoral e dados de campo para gerar previsões, indicar riscos emergentes e sugerir prioridade de ação. Conforme a TSE/ANPD, toda saída de IA é identificada e rastreável.",
    badge: "Conforme TSE 2026",
  },
  {
    icon: Megaphone,
    title: "Redes sociais, sentimento e mídia",
    detail:
      "Monitoramento de crescimento, engajamento, sentimento, posts de melhor desempenho, clipping de imprensa e acompanhamento de influenciadores relevantes. O marketing e o jurídico trabalham a partir dos mesmos dados.",
    badge: "Tempo real",
  },
  {
    icon: UsersRound,
    title: "Cabos eleitorais, CRM e voluntários",
    detail:
      "Pipeline eleitoral com registro de origem, território, votos comprometidos, nível de ativação, histórico de contato e status de cada cabo ou voluntário. A coordenação sabe quem está comprometido de verdade.",
  },
  {
    icon: WalletCards,
    title: "Verba e compliance financeiro TSE",
    detail:
      "Execução orçamentária, categorias por prestação de contas, controle de gastos por fornecedor, alertas de limite e geração de relatórios no formato exigido pelo TSE. Nenhum gasto passa sem registro.",
    badge: "100% rastreável",
  },
  {
    icon: FileCheck2,
    title: "Calculadora eleitoral e cenários de vitória",
    detail:
      "Ferramenta que calcula o coeficiente eleitoral atualizado, simula cenários com diferentes votos por zona e indica a margem de segurança real da campanha. Ideal para reuniões de coordenação semanal.",
  },
  {
    icon: FolderDown,
    title: "Materiais, biblioteca e distribuição",
    detail:
      "Upload de peças gráficas, thumbnails automáticas, organização por tema e região, controle de versão e distribuição segura para a equipe. O material certo chega para quem precisa, sem confusão de versão.",
  },
];









function BolsonaroArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 38 24" aria-hidden="true" {...props}>
      <path
        d="M1 12h30M21 3l14 9-14 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


interface LoginScreenProps {
  onLogin: () => void;
  defaultOpen?: boolean;
}

export function LoginScreen({ onLogin, defaultOpen = false }: LoginScreenProps) {
  const [showError, setShowError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Acesso inválido. Revise usuário, senha e verificação.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(defaultOpen);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [transparencyFormStatus, setTransparencyFormStatus] = useState<"idle" | "sending" | "saved" | "error">("idle");
  const [transparencyError, setTransparencyError] = useState("");
  const [transparencyStep, setTransparencyStep] = useState<"form" | "code">("form");
  const [transparencyNome, setTransparencyNome] = useState("");
  const [transparencyEmail, setTransparencyEmail] = useState("");
  const [transparencyWhatsapp, setTransparencyWhatsapp] = useState("");
  const [transparencyCode, setTransparencyCode] = useState("");
  const [requestAccessExpanded, setRequestAccessExpanded] = useState(false);
  const [requestAccessWhatsapp, setRequestAccessWhatsapp] = useState("");
  const [requestAccessError, setRequestAccessError] = useState("");
  const [volunteerSaved, setVolunteerSaved] = useState(false);
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const landingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const challengeUrl = useMemo(() => "/api/altcha/challenge", []);
  useEffect(() => {
    if (!showAccessPanel) return;
    const previous = document.activeElement as HTMLElement | null;
    loginRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setShowAccessPanel(false); }
      if (event.key !== "Tab") return;
      const controls = Array.from(document.querySelectorAll<HTMLElement>('.login-card input,.login-card button,.login-card a')).filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); if (previous?.isConnected) previous.focus(); };
  }, [showAccessPanel]);


  const getWidget = () =>
    document.getElementById(ALTCHA_WIDGET_ID) as AltchaWidgetElement | null;

  const openAccessPanel = () => {
    setShowAccessPanel(true);
    setShowError(false);
    window.setTimeout(() => loginRef.current?.focus(), 80);
  };

  const formatTransparencyWpp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  // Passo 1: valida nome/e-mail/WhatsApp e dispara o código no WhatsApp.
  const requestTransparencyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTransparencyError("");

    if (!transparencyNome.trim() || !transparencyEmail.trim() || !transparencyWhatsapp.trim()) {
      setTransparencyError("Preencha nome, e-mail e WhatsApp.");
      return;
    }
    if (transparencyWhatsapp.replace(/\D/g, "").length < 10) {
      setTransparencyError("Informe um WhatsApp válido com DDD.");
      return;
    }

    setTransparencyFormStatus("sending");
    try {
      const res = await fetch("/api/whatsapp-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: transparencyWhatsapp }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.error === "invalid_phone") setTransparencyError("Número de WhatsApp inválido.");
        else if (data?.error === "rate_limited")
          setTransparencyError("Aguarde alguns segundos antes de pedir um novo código.");
        else setTransparencyError("Não foi possível enviar o código. Tente novamente.");
        setTransparencyFormStatus("error");
        return;
      }

      setTransparencyCode("");
      setTransparencyStep("code");
      setTransparencyFormStatus("idle");
    } catch {
      setTransparencyError("Não foi possível enviar o código. Tente novamente.");
      setTransparencyFormStatus("error");
    }
  };

  // Passo 2: confere o código e salva o lead.
  const verifyTransparencyAndSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTransparencyError("");

    if (transparencyCode.replace(/\D/g, "").length !== 4) {
      setTransparencyError("Digite o código de 4 dígitos.");
      return;
    }

    setTransparencyFormStatus("sending");
    try {
      const verifyRes = await fetch("/api/whatsapp-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: transparencyWhatsapp, code: transparencyCode }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));

      if (!verifyRes.ok || !verifyData?.token) {
        if (verifyData?.error === "too_many") setTransparencyError("Muitas tentativas. Peça um novo código.");
        else if (verifyData?.error === "expired") setTransparencyError("Código expirado. Peça um novo código.");
        else setTransparencyError("Código incorreto. Confira e tente de novo.");
        setTransparencyFormStatus("error");
        return;
      }

      const response = await fetch("/api/transparency-lead", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeCompleto: transparencyNome,
          email: transparencyEmail,
          whatsapp: transparencyWhatsapp,
          verifyToken: verifyData.token,
        }),
      });

      if (!response.ok) throw new Error("lead_submit_failed");

      if (typeof window !== "undefined") {
        localStorage.setItem("scp_reg", "1");
        if (!localStorage.getItem("scp_uid")) {
          localStorage.setItem(
            "scp_uid",
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
          );
        }
      }

      setTransparencyFormStatus("saved");
      window.setTimeout(() => setShowTransparencyModal(false), 650);
    } catch {
      setTransparencyError("Não foi possível concluir agora. Tente novamente.");
      setTransparencyFormStatus("error");
    }
  };

  const resendTransparencyCode = async () => {
    setTransparencyError("");
    try {
      const res = await fetch("/api/whatsapp-otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: transparencyWhatsapp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.error === "rate_limited")
          setTransparencyError("Aguarde alguns segundos antes de pedir um novo código.");
        else setTransparencyError("Não foi possível reenviar o código.");
      }
    } catch {
      setTransparencyError("Não foi possível reenviar o código.");
    }
  };

  const submitWhatsappAccessRequest = () => {
    const normalized = requestAccessWhatsapp.replace(/\D/g, "");
    if (normalized.length < 10) {
      setRequestAccessError("Informe um WhatsApp válido com DDD para receber o código.");
      return;
    }

    setRequestAccessError("");
    const message =
      `Olá, quero solicitar login e senha provisórios para o cockpit.%0A` +
      `WhatsApp para receber o código: ${encodeURIComponent(requestAccessWhatsapp)}`;

    window.open(`https://wa.me/5511972322293?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const submit = async () => {
    const form = formRef.current;
    if (!form || !loginRef.current || !passwordRef.current) return;

    const formData = new FormData(form);
    const altchaToken = String(formData.get("altchaToken") || "");

    if (!altchaToken && !ALTCHA_DISABLED) {
      setErrorMessage("Conclua a verificação ALTCHA antes de entrar no cockpit.");
      setShowError(true);
      return;
    }

    setShowError(false);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: loginRef.current.value.trim(),
          password: passwordRef.current.value.trim(),
          altchaToken,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(
          body?.error === "altcha_failed"
            ? "A verificação ALTCHA falhou ou expirou. Tente novamente."
            : "Usuário ou senha inválidos.",
        );
        setShowError(true);
        setIsSubmitting(false);
        passwordRef.current.value = "";
        getWidget()?.reset?.();
        return;
      }

      setShowError(false);
      setIsUnlocking(true);
      window.setTimeout(() => {
        void onLogin();
      }, 360);
    } catch {
      setErrorMessage("Não foi possível validar o acesso agora. Tente novamente em instantes.");
      setShowError(true);
      setIsSubmitting(false);
      getWidget()?.reset?.();
    }
  };

  const submitVolunteer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVolunteerSaved(true);
    window.setTimeout(() => setVolunteerSaved(false), 4200);
    event.currentTarget.reset();
  };

  // Scroll reveal observer for landing sections
  useEffect(() => {
    const container = landingRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    const reveals = container.querySelectorAll(".nx-reveal");
    reveals.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    void fetch("/api/access-log", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: "landing_view",
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return (
    <div id="login-screen" className={`landing-screen${isUnlocking ? " fade-out" : ""}`} ref={landingRef}>
      <div className="landing-grid-bg" aria-hidden="true" />
      <div className="login-bg-deco" />

      {showEntryModal ? (
        <div className="entry-modal" role="dialog" aria-modal="true" aria-label="Bem-vindo">
          <button className="entry-modal-backdrop" type="button" aria-label="Fechar" onClick={() => setShowEntryModal(false)} />
          <div className="entry-modal-card">
            <button className="entry-modal-close" type="button" aria-label="Fechar" onClick={() => setShowEntryModal(false)}>
              <X size={22} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/festadavitoria.png" alt="Festa da Vitória" className="entry-modal-img" />
          </div>
        </div>
      ) : null}

      {showTransparencyModal ? (
        <div className="transparency-modal" role="dialog" aria-modal="true" aria-labelledby="transparency-title">
          <div className="transparency-card">
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setShowTransparencyModal(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                zIndex: 2,
                background: "none",
                border: "none",
                color: "#8a93a8",
                fontSize: 26,
                lineHeight: 1,
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={22} />
            </button>
            <div className="transparency-copy">
              <span className="transparency-eyebrow">Versão mais curta para caber melhor no modal</span>
              <h2 id="transparency-title">Aviso de Transparência e Conformidade Legal</h2>
              <p>
                Este site é uma demonstração ilustrativa de uma plataforma SaaS para gestão, análise e controle de
                campanhas políticas.
              </p>
              <p>
                Todos os dados, nomes, gráficos, mapas, indicadores, mensagens, imagens, simulações, bases eleitorais e
                exemplos exibidos são fictícios e utilizados apenas para fins demonstrativos. Nada neste ambiente
                representa campanha real, pesquisa eleitoral, propaganda ativa, pedido de voto, promessa de resultado ou
                apoio oficial a qualquer candidato, partido, federação ou coligação.
              </p>
              <p>
                A solução foi estruturada para respeitar a legislação eleitoral brasileira, incluindo a Lei nº 9.504/1997
                — Lei das Eleições, a Resolução TSE nº 23.610/2019, que trata da propaganda eleitoral e das condutas em
                campanha, e a Lei nº 13.709/2018 — LGPD, que regula o tratamento de dados pessoais no Brasil.
              </p>
              <p>
                O uso real da plataforma em campanhas deve observar as normas da Justiça Eleitoral, as regras de
                propaganda na internet, prestação de contas, identificação de conteúdo, tratamento adequado de dados
                pessoais e consentimento específico quando houver dados pessoais sensíveis ou dados que possam revelá-los.
              </p>
              <p>
                Ao preencher o formulário, você autoriza o uso dos dados informados exclusivamente para contato e envio
                de informações sobre a plataforma. Os dados serão encaminhados para eleicao@angra.io.
              </p>
              <p>
                Quer saber mais? Clique abaixo e fale pelo WhatsApp.
              </p>
              <a className="transparency-whatsapp" href="https://wa.me/5511972322293" target="_blank" rel="noreferrer">
                Falar pelo WhatsApp
              </a>
              <div className="transparency-url">https://wa.me/5511972322293</div>
            </div>

            {transparencyStep === "form" ? (
              <form className="transparency-form" onSubmit={requestTransparencyCode}>
                <label>
                  Nome completo
                  <input
                    name="nomeCompleto"
                    type="text"
                    autoComplete="name"
                    value={transparencyNome}
                    onChange={(e) => setTransparencyNome(e.target.value)}
                  />
                </label>
                <label>
                  E-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={transparencyEmail}
                    onChange={(e) => setTransparencyEmail(e.target.value)}
                  />
                </label>
                <label>
                  WhatsApp
                  <input
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-9999"
                    value={transparencyWhatsapp}
                    onChange={(e) => setTransparencyWhatsapp(formatTransparencyWpp(e.target.value))}
                  />
                </label>
                {transparencyError ? <div className="transparency-error">{transparencyError}</div> : null}
                <button className="transparency-submit" type="submit" disabled={transparencyFormStatus === "sending"}>
                  {transparencyFormStatus === "sending" ? "Enviando..." : "Receber código no WhatsApp"}
                </button>
              </form>
            ) : (
              <form className="transparency-form" onSubmit={verifyTransparencyAndSave}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  Enviamos um código de 4 dígitos para o WhatsApp <strong>{transparencyWhatsapp}</strong>. Digite-o abaixo
                  para confirmar.
                </p>
                <label>
                  Código de 4 dígitos
                  <input
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    placeholder="0000"
                    value={transparencyCode}
                    onChange={(e) => setTransparencyCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    style={{ letterSpacing: "0.5em", textAlign: "center", fontSize: 20, fontWeight: 700 }}
                  />
                </label>
                {transparencyError ? <div className="transparency-error">{transparencyError}</div> : null}
                {transparencyFormStatus === "saved" ? (
                  <div className="transparency-success">Acesso confirmado. Obrigado.</div>
                ) : null}
                <button className="transparency-submit" type="submit" disabled={transparencyFormStatus === "sending"}>
                  {transparencyFormStatus === "sending" ? "Confirmando..." : "Confirmar"}
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setTransparencyStep("form");
                      setTransparencyError("");
                    }}
                    style={{ background: "none", border: "none", color: "#8a93a8", cursor: "pointer", padding: 0 }}
                  >
                    ← Corrigir dados
                  </button>
                  <button
                    type="button"
                    onClick={resendTransparencyCode}
                    style={{ background: "none", border: "none", color: "#7fb0ff", cursor: "pointer", padding: 0 }}
                  >
                    Reenviar código
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      <header className="landing-nav">
        <a className="landing-brand" href="#topo" aria-label="Voltar ao início">
          <span className="landing-brand-mark"><BolsonaroArrow /></span>
          <span>
            <strong>Vitória Sempre</strong>
            <small>Inteligência de campanha</small>
          </span>
        </a>

        <nav className="landing-links" aria-label="Navegação pública">
          <a href="#estrategia">Estratégia</a>
          <a href="#sistema">SaaS</a>
          <a href="#lgpd">LGPD</a>
          <a href="#crm">CRM</a>
        </nav>

        <button className="landing-nav-cta" type="button" onClick={openAccessPanel}>
          Acessar cockpit
        </button>
      </header>

      <main className="landing-main" id="topo">
        <section className="vs-hero">
          <div className="vs-hero-copy">
            <h1>Uma campanha inteira.<br /><em>Uma visão de comando.</em></h1>
            <p>Assessoria estratégica, inteligência artificial e um cockpit de campanha para transformar energia política em comando, prioridade e voto organizado.</p>
            <div className="vs-actions">
              <button className="landing-primary-cta" type="button" onClick={openAccessPanel}>Acessar cockpit <ArrowRight size={18} /></button>
              <a className="vs-text-link" href="#sistema">Conhecer o sistema <ArrowRight size={18} /></a>
            </div>
            <div className="vs-hero-foot"><ShieldCheck size={18} /><span>Estratégia, campo e gestão em uma operação integrada.</span></div>
          </div>
          <figure className="vs-hero-visual">
            <AmbientVideo />
            <figcaption><span>Da leitura do cenário à ação de campo.</span><small>Visual ilustrativo da solução</small></figcaption>
          </figure>
        </section>
        <div className="vs-capabilities" aria-label="Áreas integradas"><span><BarChart3 size={20} /> Dados e pesquisas</span><span><Target size={20} /> Estratégia territorial</span><span><UsersRound size={20} /> Equipe e mobilização</span><span><ShieldCheck size={20} /> Gestão e compliance</span></div>
        <section className="landing-section vs-strategy" id="estrategia">
          <div className="vs-section-intro"><h2>Clareza para decidir.<br /><em>Estrutura para agir.</em></h2><p>Leitura política, disciplina de campo e comunicação coordenada. A assessoria conecta o planejamento à rotina da sua equipe.</p></div>
          <div className="vs-strategy-list">{strategySteps.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
        </section>
        <section className="landing-section vs-system" id="sistema">
          <div className="vs-section-intro"><h2>O cenário completo,<br /><em>ao alcance da equipe.</em></h2><p>Um ambiente para acompanhar pesquisas, territórios, comunicação e operação. Do computador da coordenação ao celular em campo.</p></div>
          <div className="vs-system-layout">
            <figure className="vs-product-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/telas/dashboard-politico.png" alt="Visual ilustrativo de um dashboard de campanha" loading="lazy" />
              <figcaption>Visão ilustrativa do cockpit de campanha.</figcaption>
            </figure>
            <div className="vs-feature-list">{saasFeatures.map((feature) => <details key={feature.title}><summary>{createElement(feature.icon as LucideIcon, { size: 20 })}<span>{feature.title}</span><Plus size={18} /></summary><p>{feature.detail}</p></details>)}</div>
          </div>
        </section>
        <section className="landing-section vs-governance" id="lgpd"><ShieldCheck size={36} /><div><h2>Responsabilidade em cada etapa.</h2><p>Gestão de acessos, rastreabilidade e cuidado com dados pessoais fazem parte da operação. Conheça as informações de transparência e as condições de uso da demonstração.</p><button type="button" className="vs-text-link" onClick={() => setShowTransparencyModal(true)}>Consultar transparência <ArrowRight size={18} /></button></div></section>
        <section className="landing-section landing-crm nx-reveal" id="crm">
          <div className="landing-crm-copy">
            <h2>CRM eleitoral para cabos, voluntários e multiplicadores.</h2>
            <p>
              A campanha precisa saber quem está comprometido, onde atua, quantos votos movimenta, quais materiais
              precisa e quando deve ser acionado. Esse é o ponto em que mobilização vira gestão.
            </p>

            <div className="landing-crm-flow">
              <span><DatabaseZap /> Contato</span>
              <span><ClipboardCheck /> Compromisso</span>
              <span><UsersRound /> Multiplicação</span>
              <span><Vote /> Voto</span>
            </div>
          </div>

          <form className="landing-crm-form nx-reveal" onSubmit={submitVolunteer}>
            <div className="landing-form-grid">
              <label>
                Nome Completo
                <input required type="text" name="nome" placeholder="Seu nome" />
              </label>
              <label>
                WhatsApp
                <input required type="tel" name="whatsapp" placeholder="(21) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel" />
              </label>
            </div>
            <label>
              Região de Atuação
              <select name="regiao">
                <option>Selecione uma região</option>
                <option>Baixada</option>
                <option>Capital</option>
                <option>Interior RJ</option>
              </select>
            </label>
            <label>
              Como pode ajudar
              <textarea name="apoio" rows={3} placeholder="Rua, WhatsApp, evento, liderança local, conteúdo..." />
            </label>
            <button type="submit" className="landing-primary-cta">
              Enviar para triagem <ArrowRight />
            </button>
            <div className={`landing-form-success${volunteerSaved ? " visible" : ""}`}>
              Cadastro recebido para triagem da coordenação.
            </div>
          </form>
        </section>


        <section className="landing-section vs-contact"><h2>Vamos organizar<br /><em>o próximo passo.</em></h2><div><p>Converse com a equipe sobre a assessoria estratégica e o cockpit para sua operação.</p><a className="landing-primary-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Falar com a equipe <MessageCircleMore size={20} /></a></div></section>
      </main>

      <footer className="landing-footer">
        © {new Date().getFullYear()} Vitória Sempre: — Assessoria Política Estratégica + SaaS de Campanha
      </footer>

      {showAccessPanel ? (
        <div className="login-access-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
          <button
            className="login-modal-backdrop"
            type="button"
            aria-label="Fechar acesso restrito"
            onClick={() => setShowAccessPanel(false)}
          />
          <div className="login-card">
            <button
              className="login-close-button"
              type="button"
              aria-label="Fechar formulário de login"
              onClick={() => setShowAccessPanel(false)}
            >
              <X />
            </button>

            <div className="login-logo-wrap">
              <div className="login-title" id="login-modal-title">Bem-vindo ao cockpit.</div>
              <div className="login-subtitle">
                Área segura para equipe autorizada
              </div>
            </div>

            <div className="login-divider" />

            <form
              ref={formRef}
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="login-field-wrap">
                <label className="login-field-label" htmlFor="inp_login">
                  Usuário
                </label>
                <input
                  ref={loginRef}
                  className={`login-field${showError ? " shake" : ""}`}
                  id="inp_login"
                  type="text"
                  placeholder="Seu usuário"
                  name="username"
                  required
                  autoCapitalize="none"
                  spellCheck={false}
                  autoComplete="username"
                />
              </div>

              <div className="login-field-wrap">
                <label className="login-field-label" htmlFor="inp_senha">
                  Senha
                </label>
                <input
                  ref={passwordRef}
                  className={`login-field${showError ? " shake" : ""}`}
                  id="inp_senha"
                  type={passwordVisible ? "text" : "password"}
                  required
                  name="password"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button className="login-show-password" type="button" aria-pressed={passwordVisible} onClick={() => setPasswordVisible((v) => !v)}>{passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}{passwordVisible ? "Ocultar senha" : "Mostrar senha"}</button>
              {!ALTCHA_DISABLED && (
                <div className="login-altcha-wrap">
                  <div className="login-field-label">Verificação anti-bot</div>
                  {createElement("altcha-widget", {
                    id: ALTCHA_WIDGET_ID,
                    auto: "onload",
                    challenge: challengeUrl,
                    name: "altchaToken",
                    type: "checkbox",
                  })}
                </div>
              )}

              <button className="login-btn" id="login-btn" disabled={isSubmitting || isUnlocking} type="submit">
                {isSubmitting || isUnlocking ? "Autenticando..." : "Entrar no Cockpit"}
              </button>
            </form>

            <div className="request-access-panel">
              <button
                className="request-access-toggle"
                type="button"
                onClick={() => setRequestAccessExpanded((value) => !value)}
              >
                Ainda não tenho acesso
              </button>
              {requestAccessExpanded ? (
                <div className="request-access-body">
                  <label className="login-field-label" htmlFor="inp_request_whatsapp">
                    WhatsApp para receber o código
                  </label>
                  <input
                    id="inp_request_whatsapp"
                    className="login-field"
                    type="tel"
                    placeholder="(21) 99999-9999"
                    inputMode="tel"
                    autoComplete="tel"
                    value={requestAccessWhatsapp}
                    onChange={(event) => setRequestAccessWhatsapp(event.target.value)}
                  />
                  {requestAccessError ? <div className="request-access-error">{requestAccessError}</div> : null}
                  <button className="request-access-submit" type="button" onClick={submitWhatsappAccessRequest}>
                    Enviar pedido pelo WhatsApp
                  </button>
                </div>
              ) : null}
            </div>

            <div className={`login-error${showError ? " visible" : ""}`} id="login-error" role="alert">
              {errorMessage}
            </div>

            <div className="login-footer">
              <span className="login-dot-live" />
              Acesso restrito à equipe autorizada
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
