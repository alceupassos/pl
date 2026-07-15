"use client";

import "altcha";

import { createElement, type FormEvent, type ReactElement, type SVGProps, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  FileCheck2,
  FolderDown,
  Gavel,
  Megaphone,
  Network,
  ShieldCheck,
  Target,
  UsersRound,
  Vote,
  WalletCards,
  MessageCircleMore,
  FileSearch,
  LineChart,
  ShieldAlert,
  X,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CADASTRO_LIVRE } from "@/lib/cadastro-gate";

type AltchaWidgetElement = HTMLElement & {
  getState?: () => string;
  reset?: () => void;
};

type IconLike = LucideIcon | ((props: SVGProps<SVGSVGElement>) => ReactElement);

type FeatureCard = {
  icon: IconLike;
  title: string;
  text: string;
};

const ALTCHA_WIDGET_ID = "login-altcha-widget";
// Bypass temporário do ALTCHA para testes mobile — espelha DISABLE_ALTCHA do servidor.
const ALTCHA_DISABLED = process.env.NEXT_PUBLIC_DISABLE_ALTCHA === "true";

const commandMetrics = [
  { label: "controle diário", value: "24h", detail: "sala de situação sempre pronta" },
  { label: "áreas integradas", value: "30", detail: "da pesquisa ao jurídico" },
  { label: "operação de campo", value: "1", detail: "CRM, cabos, voluntários e materiais" },
  { label: "cobertura eleitoral", value: "100%", detail: "dados, campo e compliance unificados" },
];

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

const systemModules: FeatureCard[] = [
  {
    icon: Vote,
    title: "Inteligência de Intenção",
    text: "Monitoramento de votos por bairro, evolução histórica e alertas de perda de tração territorial em tempo real.",
  },
  {
    icon: Target,
    title: "Mapa de Força Local",
    text: "Ranking de adversários em cada zona eleitoral e identificação de oportunidades em bairros sub-explorados.",
  },
  {
    icon: Megaphone,
    title: "Comando de Narrativa",
    text: "Gestão de sentimentos nas redes, controle de fake news e distribuição de pautas oficiais para multiplicadores.",
  },
  {
    icon: UsersRound,
    title: "CRM de Alta Performance",
    text: "Gestão individual de cabos eleitorais e voluntários com metas de prospecção e geolocalização de campo.",
  },
  {
    icon: FileCheck2,
    title: "Gestão Financeira & Compliance",
    text: "Rastreabilidade total de gastos, prestação de contas prévia ao TSE e compliance jurídico integrado.",
  },
  {
    icon: BrainCircuit,
    title: "Previsibilidade de Vitória",
    text: "Simuladores de coeficiente e IA preditiva para antecipar o resultado final com base na evolução semanal.",
  },
];

const serviceSummary = [
  "Ao contratar uma profissional de marketing político formada neste método, o candidato passa a ter uma estrutura completa de apoio para sua comunicação de campanha.",
  "Ele terá à disposição estratégia de posicionamento, construção de narrativa, planejamento de conteúdo, roteiros para vídeos, mensagens para WhatsApp, apoio em agendas de rua, organização de materiais, leitura de adversários, resposta a crises, calendário de publicações e orientação para fortalecer sua imagem pública.",
  "Na prática, cada ação da campanha passa a ser melhor aproveitada. A visita ao bairro vira conteúdo. A conversa com o morador vira mensagem. A proposta vira vídeo. A reunião vira mobilização. O apoiador vira multiplicador. A história do candidato vira narrativa.",
  "O objetivo é tirar a campanha do improviso e transformar a comunicação em uma ferramenta diária de presença, confiança e conexão com o eleitor. O candidato ganha clareza. A equipe ganha direção. E o eleitor passa a entender melhor quem é o candidato, o que ele defende e por que ele merece ser levado a sério.",
];

const advisoryBenefits: FeatureCard[] = [
  {
    icon: Target,
    title: "1. Estratégia de campanha mais clara",
    text: "Define imagem, público prioritário, bairros, temas repetidos, tom de fala, assuntos a evitar e como o candidato será lembrado pelo eleitor.",
  },
  {
    icon: ShieldCheck,
    title: "2. Posicionamento político organizado",
    text: "Cria uma bússola simples para o nome ser associado a uma causa, uma dor ou uma solução real, em vez de parecer só mais um na disputa.",
  },
  {
    icon: BrainCircuit,
    title: "3. Narrativa forte sobre quem ele é",
    text: "Transforma origem, trajetória, lutas, entregas e propósito em uma história compreensível, convincente e fácil de defender em toda a campanha.",
  },
  {
    icon: Megaphone,
    title: "4. Conteúdo diário para redes sociais",
    text: "Cards, vídeos curtos, legendas, reels, stories, bastidores, propostas, conteúdos por bairro e por causa para manter presença e ritmo.",
  },
  {
    icon: MessageCircleMore,
    title: "5. Roteiros para o candidato falar melhor",
    text: "Vídeos de apresentação, respostas a críticas, convites, falas curtas para evento e conteúdos de 30 segundos com mais objetividade.",
  },
  {
    icon: UsersRound,
    title: "6. Melhor aproveitamento das agendas de rua",
    text: "Cada caminhada, reunião ou visita vira foto, vídeo, depoimento, demanda registrada, conteúdo de prova e memória política útil.",
  },
  {
    icon: MessageCircleMore,
    title: "7. Mensagens prontas para WhatsApp",
    text: "Apresentação, convite, agradecimento, mobilização, pós-evento, combate a boatos e pedido de apoio com método e consistência.",
  },
  {
    icon: FolderDown,
    title: "8. Materiais de campanha mais coerentes",
    text: "Santinhos, faixas, adesivos, vídeos, banners, camisetas, cards e apresentações passam a falar a mesma língua visual e política.",
  },
  {
    icon: ClipboardCheck,
    title: "9. Calendário de campanha",
    text: "Organiza o que postar, quando postar, que tema reforçar, que bairro destacar, quando gravar e quando publicar conteúdo emocional ou técnico.",
  },
  {
    icon: CheckCircle2,
    title: "10. Apoio para construir autoridade",
    text: "Mostra conhecimento dos problemas locais, histórico de trabalho, liderança, escuta ativa e postura de quem sabe o que está fazendo.",
  },
  {
    icon: BarChart3,
    title: "11. Leitura dos adversários e do ambiente político",
    text: "Acompanha o que cresce, o que deve ser respondido, o que precisa ser ignorado e onde a disputa está apertando mais.",
  },
  {
    icon: Gavel,
    title: "12. Respostas mais inteligentes a críticas e ataques",
    text: "Ajuda a decidir quando responder, como responder, quando não alimentar polêmica e quando acionar o jurídico.",
  },
  {
    icon: UsersRound,
    title: "13. Organização da imagem pública",
    text: "Orienta postura, roupa, fotografia, tom de voz, linguagem corporal e equilíbrio entre autenticidade e preparo.",
  },
  {
    icon: BarChart3,
    title: "14. Relatórios simples de desempenho",
    text: "Mostra o que performa melhor, que temas geram reação, que bairros respondem mais e o que precisa ser reforçado rapidamente.",
  },
  {
    icon: Network,
    title: "15. Organização dos apoiadores digitais",
    text: "Transforma simpatizantes em multiplicadores com materiais certos, mensagens curtas, calendário e orientação do que compartilhar.",
  },
  {
    icon: FolderDown,
    title: "16. Banco de conteúdo da campanha",
    text: "Reúne fotos, vídeos, depoimentos, frases, propostas, legendas aprovadas e materiais por tema ou região para reaproveitamento rápido.",
  },
  {
    icon: DatabaseZap,
    title: "17. Mais clareza para a equipe inteira",
    text: "Designer, social media, videomaker, fotógrafo, coordenador e apoiador passam a operar dentro do mesmo sistema de comunicação.",
  },
  {
    icon: ClipboardCheck,
    title: "18. Redução de erros básicos",
    text: "Evita post sem revisão, frase ambígua, vídeo longo demais, foto ruim, mudança de discurso, promessa imprudente e agenda sem registro.",
  },
  {
    icon: Vote,
    title: "19. Uma campanha com mais presença",
    text: "Presença na rua, nas redes, no WhatsApp, nos bairros e na memória do eleitor, sempre com mensagem parecida e reconhecível.",
  },
  {
    icon: WalletCards,
    title: "20. Um método para transformar tudo em comunicação",
    text: "Reunião vira post, caminhada vira vídeo, demanda vira proposta, apoiador vira depoimento e a rotina da campanha vira presença política.",
  },
];

const lgpdAllowed = [
  "Coleta de dados fundamentada no legítimo interesse e consentimento explícito, com finalidades eleitorais estritamente declaradas (Art. 7º, I e IX).",
  "Segmentação territorial e de base baseada em dados públicos e interações diretas documentadas, com registro de procedência (Art. 15).",
  "Uso de IA generativa para otimização de fluxos de trabalho e criação de conteúdo com rotulagem explícita de 'conteúdo sintético' (Res. TSE 23.732).",
  "Tratamento de dados sensíveis (opinião política) sob regime de proteção reforçada e criptografia ponta-a-ponta, com DPO dedicado à campanha.",
  "Ativação de redes de apoiadores (multiplicadores) via opt-in verificado, garantindo o direito de revogação imediata a qualquer tempo (Art. 18).",
  "Interoperabilidade segura com sistemas do TSE para prestação de contas, utilizando APIs oficiais e tokens de autenticação auditáveis.",
  "Armazenamento em nuvem soberana com redundância e trilhas de log imutáveis para garantir a integridade dos dados durante todo o pleito.",
  "Implementação de Privacy by Design em todas as ferramentas de campo, minimizando a coleta ao estritamente necessário para a estratégia.",
];

const lgpdBlocked = [
  "Comercialização, cessão ou troca de bases de dados entre candidatos, partidos ou empresas — prática vedada que acarreta cassação e multas pesadas.",
  "Uso de IA para criação de deepfakes, desinformação (fake news) ou simulação de declarações falsas de adversários ou autoridades (Crime Eleitoral).",
  "Disparos em massa via ferramentas de automação não oficiais ou sem rastreabilidade de origem (Opt-in), caracterizando abuso de poder econômico.",
  "Tratamento de dados de menores de idade ou grupos vulneráveis sem autorização específica e reforçada de responsáveis legais e curadores.",
  "Perfilamento psicológico de eleitores (microtargeting) baseado em dados sensíveis coletados sem transparência ou por meios ilícitos.",
  "Manutenção de dados pessoais após o encerramento das eleições sem nova finalidade legítima ou base legal que sustente a retenção (Art. 16).",
  "Omissão de incidentes de segurança ou vazamentos de dados, o que gera responsabilidade solidária direta do candidato perante a ANPD e o TSE.",
  "Coleta de dados em órgãos públicos ou através de cargos de confiança, misturando estrutura de governo com estrutura de campanha.",
];

type LgpdControl = { area: string; measure: string };

const lgpdControls: LgpdControl[] = [
  { area: "Responsável pelo tratamento", measure: "Designado DPO (Encarregado de Dados) com canal público de contato para exercício de direitos dos titulares." },
  { area: "Acesso ao sistema", measure: "Autenticação com senha forte + verificação ALTCHA. Cada usuário acessa apenas os dados da sua área de atuação." },
  { area: "Armazenamento e criptografia", measure: "Dados armazenados com criptografia AES-256 em repouso e TLS 1.3 em trânsito. Backup diário com retenção controlada." },
  { area: "Rastreabilidade de IA", measure: "Todo conteúdo gerado por IA é registrado com timestamp, modelo utilizado e responsável pela publicação — rastreável para auditoria do TSE." },
  { area: "Consentimento documentado", measure: "Formulários de captação com texto de consentimento claro, checkbox explícito e armazenamento do registro com data, IP e versão do termo." },
  { area: "Direitos dos titulares", measure: "Canal ativo para acesso, correção, portabilidade e eliminação de dados. Atendimento em até 15 dias com resposta documentada." },
];

const cockpitScreens = [
  { src: "/pass/pagina0.png",     alt: "Dashboard principal do cockpit de campanha",      label: "Dashboard" },
  { src: "/pass/pagoa0.5.png",    alt: "Visão executiva do cockpit de campanha",           label: "Visão executiva" },
  { src: "/pass/pagina1.png",     alt: "Pesquisas e intenção de voto",                     label: "Pesquisas" },
  { src: "/pass/pagina3.png",     alt: "Territórios e mapa de força por região",           label: "Territórios" },
  { src: "/pass/pagina5.png",     alt: "Redes sociais e sentimento da campanha",           label: "Redes sociais" },
  { src: "/pass/pagina6.png",     alt: "Concorrentes e monitoramento de adversários",      label: "Concorrentes" },
  { src: "/pass/pagina7.jpg.png", alt: "Cabos eleitorais e CRM de campo",                 label: "Campo e CRM" },
  { src: "/pass/pagina8.jpg.png", alt: "Financeiro e compliance TSE",                     label: "Financeiro / TSE" },
  { src: "/pass/pagina9.png",     alt: "Downloads e biblioteca de materiais",              label: "Materiais" },
  { src: "/pass/pagina10.png",    alt: "Calculadora eleitoral e cenários de vitória",      label: "Calculadora" },
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

function IconBadge({ icon: Icon }: { icon: IconLike }) {
  return (
    <span className="landing-icon-badge">
      <Icon />
    </span>
  );
}

interface LoginScreenProps {
  onLogin: () => void;
  defaultOpen?: boolean;
}

export function LoginScreen({ onLogin, defaultOpen = false }: LoginScreenProps) {
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Acesso inválido. Revise usuário, senha e verificação.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(defaultOpen);
  const [showEntryModal, setShowEntryModal] = useState(true);
  const [showTransparencyModal, setShowTransparencyModal] = useState(false);
  const [transparencyFormStatus, setTransparencyFormStatus] = useState<"idle" | "sending" | "saved" | "error">("idle");
  const [transparencyError, setTransparencyError] = useState("");
  const [transparencyAviso, setTransparencyAviso] = useState("");
  const [transparencyStep, setTransparencyStep] = useState<"form" | "code">("form");
  const [transparencyNome, setTransparencyNome] = useState("");
  const [transparencyEmail, setTransparencyEmail] = useState("");
  const [transparencyWhatsapp, setTransparencyWhatsapp] = useState("");
  const [transparencyCode, setTransparencyCode] = useState("");
  const [requestAccessExpanded, setRequestAccessExpanded] = useState(false);
  const [requestAccessWhatsapp, setRequestAccessWhatsapp] = useState("");
  const [requestAccessError, setRequestAccessError] = useState("");
  const [volunteerSaved, setVolunteerSaved] = useState(false);
  useEffect(() => {
    // Cadastro só no primeiro acesso: se já registrou neste dispositivo, não pede de novo.
    const alreadyRegistered =
      typeof window !== "undefined" && localStorage.getItem("scp_reg") === "1";
    const timer = window.setTimeout(() => {
      setShowEntryModal(false);
      if (!alreadyRegistered && !CADASTRO_LIVRE) setShowTransparencyModal(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const landingRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const challengeUrl = useMemo(() => "/api/altcha/challenge", []);

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

      // Celular já cadastrado → libera acesso sem enviar código.
      if (res.ok && data?.alreadyRegistered) {
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
        setTransparencyAviso("Celular já cadastrado. Acesso liberado.");
        setTransparencyFormStatus("saved");
        window.setTimeout(() => setShowTransparencyModal(false), 1200);
        return;
      }

      if (!res.ok) {
        if (data?.error === "invalid_phone") setTransparencyError("Número inválido.");
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
                {transparencyAviso ? <div className="transparency-success">{transparencyAviso}</div> : null}
                <button className="transparency-submit" type="submit" disabled={transparencyFormStatus === "sending" || !!transparencyAviso}>
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
            <strong>COMO GANHAR A ELEIÇÃO:</strong>
            <small>Assessoria + SaaS eleitoral</small>
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
        <section className="landing-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="landing-hero-bg"
            src="/telas/rua2.png"
            alt="Equipe de campanha em ação de rua conversando com eleitores"
          />
          <div className="landing-hero-shade" />
          <div className="landing-hero-content">
            <h1>COMO GANHAR <span className="nx-serif">A ELEIÇÃO:</span></h1>
            <p className="landing-hero-sub">
              Assessoria estratégica, inteligência artificial e um cockpit de campanha para transformar energia política
              em comando, prioridade e voto organizado.
            </p>
            <div className="landing-hero-tags">
              <a href="#estrategia" className="nx-btn-glass">Estratégia</a>
              <a href="#sistema" className="nx-btn-glass">Sistema SaaS</a>
              <a href="#crm" className="nx-btn-glass">CRM Eleitoral</a>
              <a href="#lgpd" className="nx-btn-glass">LGPD & Compliance</a>
            </div>
            <div className="landing-hero-actions">
              <a className="landing-whatsapp-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                Falar no WhatsApp <MessageCircleMore />
              </a>
              <a className="landing-primary-cta" href="#estrategia">
                Ver estratégia completa <ArrowRight />
              </a>
              <button className="landing-secondary-cta" type="button" onClick={openAccessPanel}>
                Entrar na área restrita
              </button>
            </div>
          </div>
        </section>

        <section className="landing-command-strip" aria-label="Indicadores da solução">
          {commandMetrics.map((metric) => (
            <div className="landing-command-metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </div>
          ))}
        </section>

        <section className="landing-section landing-strategy nx-reveal" id="estrategia">
          <div className="landing-section-head">
            <h2>Campanha profissional <span className="nx-serif">não depende</span> de sorte.</h2>
            <p>
              Ela combina leitura política, disciplina de campo, dados confiáveis, comunicação coordenada e segurança
              jurídica. O serviço organiza tudo isso em uma operação única para o candidato e sua coordenação.
            </p>
          </div>

          <div className="landing-pillar-grid">
            <article className="landing-feature-card nx-reveal-delay-1">
              <IconBadge icon={FileSearch} />
              <h3>Diagnóstico de Força</h3>
              <p>Cruzamento de dados históricos, pesquisas qualitativas e mapeamento de lideranças para definir o ponto de partida real e os territórios prioritários.</p>
            </article>
            <article className="landing-feature-card nx-reveal-delay-2">
              <IconBadge icon={ShieldCheck} />
              <h3>Blindagem Jurídica</h3>
              <p>Assessoria em LGPD e conformidade com as normas do TSE 2026, garantindo que cada dado coletado e cada peça de IA seja auditável e segura.</p>
            </article>
            <article className="landing-feature-card nx-reveal-delay-3">
              <IconBadge icon={Megaphone} />
              <h3>Comunicação de Alto Impacto</h3>
              <p>Narrativa política construída sobre as dores reais do eleitorado, convertendo propostas complexas em mensagens claras, repetíveis e virais.</p>
            </article>
          </div>

          <div className="landing-strategy-steps">
            <h3 className="landing-steps-title">Como funciona na prática: <span className="nx-serif">o método em 6 etapas</span></h3>
            <div className="landing-steps-grid">
              {strategySteps.map((s) => (
                <div className="landing-step-card" key={s.step}>
                  <span className="landing-step-number">{s.step}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-summary nx-reveal">
          <div className="landing-section-head align-left">
            <h2>O que entra quando a assessoria <span className="nx-serif">política estratégica</span> é contratada.</h2>
          </div>
          <div className="landing-summary-layout">
            <div className="landing-summary-copy">
              {serviceSummary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="landing-inline-cta-row">
                <a className="landing-primary-cta" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                  Conversar sobre a campanha <MessageCircleMore />
                </a>
              </div>
            </div>
            <figure className="landing-summary-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/telas/rua14.png" alt="Equipe política distribuindo materiais e conversando com moradores na rua" />
            </figure>
          </div>
        </section>

        <section className="landing-section landing-product nx-reveal" id="sistema">
          <div className="landing-product-copy">
            <h2>O SaaS vira a sala de situação da campanha.</h2>
            <p>
              Cada módulo existe para reduzir improviso, acelerar decisão e fazer a coordenação enxergar o que
              precisa ser cobrado agora. O candidato gerencia a campanha como um CEO gerencia uma operação.
            </p>
            <div className="landing-check-list">
              <span><CheckCircle2 /> Dashboard executivo com pesquisas e intenção de voto em tempo real.</span>
              <span><CheckCircle2 /> Territórios, mapa de força e IA preditiva conforme TSE 2026.</span>
              <span><CheckCircle2 /> CRM de campo, cabos eleitorais, voluntários e materiais organizados.</span>
              <span><CheckCircle2 /> Verba, compliance TSE rastreável e calculadora de coeficiente eleitoral.</span>
            </div>
          </div>

          <div className="landing-saas-feature-grid">
            <article className="landing-saas-card nx-reveal-delay-1">
              <div className="landing-saas-card-head">
                <IconBadge icon={LineChart} />
                <span className="landing-saas-badge">Tempo Real</span>
              </div>
              <h3>Inteligência de Votos</h3>
              <p>Mapeamento georreferenciado que mostra exatamente onde estão seus apoiadores e quais zonas precisam de reforço imediato de material.</p>
            </article>
            <article className="landing-saas-card nx-reveal-delay-2">
              <div className="landing-saas-card-head">
                <IconBadge icon={UsersRound} />
                <span className="landing-saas-badge">Mobile First</span>
              </div>
              <h3>Gestão de Equipe e CRM</h3>
              <p>Controle total sobre cabos eleitorais e voluntários. Distribuição de tarefas, check-in em eventos e metas de cadastramento rastreáveis.</p>
            </article>
            <article className="landing-saas-card nx-reveal-delay-3">
              <div className="landing-saas-card-head">
                <IconBadge icon={ShieldAlert} />
                <span className="landing-saas-badge">Anti-Risco</span>
              </div>
              <h3>Módulo LGPD Integrado</h3>
              <p>Base de dados blindada. Gestão de consentimento automática e trilha de auditoria para proteger o candidato de sanções jurídicas.</p>
            </article>
          </div>

          <div className="landing-screen-stack" aria-label="Telas do SaaS">
            {cockpitScreens.map((screen) => (
              <figure className="landing-screen-card" key={screen.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screen.src} alt={screen.alt} />
                <figcaption>{screen.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="landing-section landing-modules nx-reveal">
          <div className="landing-section-head">
            <h2>Tudo que a assessoria coloca na mão da coordenação.</h2>
            <p>
              O candidato deixa de depender de conversas soltas e passa a trabalhar com rotina, painel, responsáveis,
              prazos e leitura integrada da eleição.
            </p>
          </div>

          <div className="landing-module-grid">
            {systemModules.map((module) => (
              <article className="landing-feature-card compact" key={module.title}>
                <IconBadge icon={module.icon} />
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-benefits nx-reveal">
          <div className="landing-section-head">
            <h2>O político passa a ter uma estrutura real de comunicação ao lado dele.</h2>
            <p>
              Ele deixa de depender de improviso, opinião de apoiador, frase criada em cima da hora ou post feito na
              correria. A campanha ganha método, repetição, coerência e mais capacidade de ser lembrada.
            </p>
          </div>
          <section className="landing-section landing-saas nx-reveal" id="sistema">
          <div className="landing-section-head">
            <span className="nx-tag">Cockpit de Campanha</span>
            <h2>O sistema que dá <span className="nx-serif">visão total</span> para a vitória.</h2>
            <p>
              Abandone as planilhas soltas e as mensagens perdidas. Centralize a inteligência da sua campanha em uma
              plataforma robusta, segura e em total conformidade com a LGPD e as normas do TSE.
            </p>
          </div>

          <div className="landing-saas-grid">
            {saasFeatures.map((f) => (
              <article className="landing-saas-card nx-reveal" key={f.title}>
                <div className="landing-saas-card-header">
                  <IconBadge icon={f.icon as LucideIcon} />
                  {f.badge && <span className="landing-saas-badge">{f.badge}</span>}
                </div>
                <h3>{f.title}</h3>
                <p>{f.detail}</p>
              </article>
            ))}
          </div>

          <div className="landing-saas-showcase nx-reveal">
            <div className="landing-showcase-copy">
              <h3>Módulos de Gestão Avançada</h3>
              <div className="landing-module-list">
                {systemModules.map((m) => (
                  <div className="landing-module-item" key={m.title}>
                    <div className="landing-module-icon">{createElement(m.icon as LucideIcon)}</div>
                    <div>
                      <strong>{m.title}</strong>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="landing-showcase-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/telas/rua12.png" alt="Dashboard do sistema com gráficos de intenção de voto" />
              <div className="landing-visual-overlay">
                <div className="landing-visual-pill">Inteligência 24h</div>
                <div className="landing-visual-pill">Monitoramento Geográfico</div>
              </div>
            </div>
          </div>
        </section>
          <div className="landing-benefit-grid">
            {advisoryBenefits.map((benefit) => (
              <article className="landing-feature-card benefit" key={benefit.title}>
                <IconBadge icon={benefit.icon} />
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-saas nx-reveal" id="tecnologia">
          <div className="landing-section-head">
            <div className="nx-badge">TECNOLOGIA ELEITORAL</div>
            <h2>Vitória Sempre: <span className="nx-serif">O Software que comanda a vitória.</span></h2>
            <p>
              Nossa plataforma centraliza o que realmente importa: intenção de voto, desempenho de cabos eleitorais e
              alertas de ataques digitais. Menos planilha, mais comando.
            </p>
          </div>

          <div className="landing-saas-showcase">
            <div className="landing-saas-mockups">
              <div className="landing-saas-card floating-1">
                <header>Inteligência de Rede</header>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/telas/rua13.png" alt="Dashboard de análise de redes sociais" />
              </div>
              <div className="landing-saas-card floating-2">
                <header>Controle Financeiro</header>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/telas/rua11.png" alt="Mapeamento de despesas e arrecadação" />
              </div>
              <div className="landing-saas-card floating-3">
                <header>Gestão de Atividades</header>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/telas/rau10.png" alt="Controle de agenda e militância" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-timeline nx-reveal" id="metodo">
          <div className="landing-section-head">
            <h2>Fases da Metodologia: <span className="nx-serif">do diagnóstico à urna.</span></h2>
            <p>Um cronograma rigoroso para que nada seja deixado ao acaso no dia da eleição.</p>
          </div>
          <div className="landing-timeline-grid">
            {[
              { phase: "01", title: "Diagnóstico", desc: "Análise de dados, mapeamento de lideranças e setup tecnológico." },
              { phase: "02", title: "Narrativa", desc: "Criação de identidade verbal e IA de resposta rápida." },
              { phase: "03", title: "Mobilização", desc: "Ativação do CRM eleitoral e treinamento de equipes de rua." },
              { phase: "04", title: "Intensificação", desc: "Tráfego pago, análise de sentimento e reação em tempo real." },
              { phase: "05", title: "Dia D", desc: "Logística de fiscais e garantia de voto na urna." }
            ].map((item) => (
              <div className="landing-timeline-item" key={item.phase}>
                <div className="timeline-number">{item.phase}</div>
                <div className="timeline-content">
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-gallery nx-reveal">
          <div className="landing-section-head">
            <h2>Rua, mobilização, presença e material de campanha trabalhando juntos.</h2>
            <p>
              A assessoria organiza a comunicação para que cada ação na rua tenha função política, visual e operacional.
            </p>
          </div>
          <div className="landing-gallery-grid">
            {["/telas/rua2.png", "/telas/rua18.png", "/telas/rua19.png"].map((src) => (
              <figure className="landing-gallery-card" key={src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="Registro de mobilização de campanha com equipe e moradores" />
              </figure>
            ))}
          </div>
        </section>

        <section className="landing-section landing-lgpd nx-reveal" id="lgpd">
          <div className="landing-section-head align-left">
            <h2>LGPD, TSE e IA: <span className="nx-serif">sabemos o que pode e o que não pode.</span></h2>
            <p>
              Transparência total sobre os limites legais. A operação foi construída para que jurídico, coordenação e
              marketing trabalhem com as mesmas regras — sem brecha e sem improviso.
            </p>
          </div>

          <div className="landing-law-grid">
            <article className="landing-law-panel allowed">
              <h3><ShieldCheck /> Pode fazer com método</h3>
              {lgpdAllowed.map((item) => (
                <p key={item}><CheckCircle2 /> {item}</p>
              ))}
            </article>
            <article className="landing-law-panel blocked">
              <h3><Gavel /> Não pode virar risco</h3>
              {lgpdBlocked.map((item) => (
                <p key={item}><X /> {item}</p>
              ))}
            </article>
          </div>

          <div className="landing-lgpd-controls">
            <h3 className="landing-steps-title">Nossos controles internos: <span className="nx-serif">como garantimos a conformidade</span></h3>
            <div className="landing-controls-table">
              {lgpdControls.map((ctrl) => (
                <div className="landing-control-row" key={ctrl.area}>
                  <strong><ShieldCheck /> {ctrl.area}</strong>
                  <p>{ctrl.measure}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="landing-source-note">
            Referências operacionais:{" "}
            <a href="https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes" target="_blank" rel="noreferrer">
              FAQ LGPD/ANPD
            </a>
            ,{" "}
            <a href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_lgpd_final.pdf" target="_blank" rel="noreferrer">
              Guia ANPD/TSE para contexto eleitoral
            </a>
            {" "}e{" "}
            <a href="https://www.tse.jus.br/comunicacao/noticias/2026/Abril/por-dentro-das-eleicoes-conheca-as-regras-sobre-uso-de-ia-na-campanha-eleitoral-de-2026" target="_blank" rel="noreferrer">
              regras do TSE sobre IA nas Eleições 2026
            </a>
            .
          </div>
        </section>

        <section className="landing-section landing-faq nx-reveal" id="faq">
          <div className="landing-section-head">
            <h2>Dúvidas Frequentes</h2>
            <p>Respostas rápidas sobre como operamos sua campanha.</p>
          </div>
          <div className="landing-faq-grid">
            {[
              { q: "A IA substitui o consultor?", a: "Não, ela potencializa a velocidade e o volume de resposta, permitindo que a consultoria foque em estratégia e não em processos manuais." },
              { q: "É seguro legalmente?", a: "Sim, seguimos todas as resoluções do TSE de 2026 sobre IA e LGPD, com marcas d'água e avisos obrigatórios." },
              { q: "Funciona para cidades pequenas?", a: "Sim, o método é adaptável para qualquer escala, otimizando recursos onde eles são mais escassos." },
              { q: "Como é feito o treinamento da equipe?", a: "Presencial e digital, com manuais operacionais e simulações de crise." }
            ].map((item, idx) => (
              <details className="landing-faq-item" key={idx}>
                <summary>{item.q} <Plus /></summary>
                <div className="faq-answer">{item.a}</div>
              </details>
            ))}
          </div>
        </section>

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
                <input required type="tel" name="whatsapp" placeholder="(00) 00000-0000" />
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

        <section className="landing-section landing-final-cta nx-reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/telas/rau10.png" alt="Tenda de mobilização política com equipe atendendo moradores" />
          <div>
            <h2>Quem comanda melhor, reage mais rápido e desperdiça menos campanha.</h2>
            <p>
              Vitória Sempre une assessoria política, marketing digital, engenharia de IA e SaaS de controle para dar
              ao candidato uma máquina de campanha profissional do primeiro diagnóstico ao dia da eleição.
            </p>
            <div className="landing-hero-actions">
              <a className="nx-btn-glass" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
                Atendimento Estratégico <ArrowRight />
              </a>
              <button className="nx-btn-glass secondary" type="button" onClick={openAccessPanel}>
                Acessar Cockpit de Demonstração
              </button>
            </div>
          </div>
        </section>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="login-logo-img"
                src="/flaviologo.png"
                alt="Flavio Bolsonaro"
              />
              <div className="login-title" id="login-modal-title">Cockpit de Campanha</div>
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
                  Usuario
                </label>
                <input
                  ref={loginRef}
                  className={`login-field${showError ? " shake" : ""}`}
                  id="inp_login"
                  type="text"
                  placeholder="nome de usuario"
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
                  type="password"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
              </div>

              {ALTCHA_DISABLED ? (
                <div className="login-altcha-wrap">
                  <div className="login-altcha-note" role="status">
                    Verificação anti-bot temporariamente desativada (modo de teste)
                  </div>
                </div>
              ) : (
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
                Solicitar login e senha provisórios
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
                    placeholder="(00) 00000-0000"
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

            <div className={`login-error${showError ? " visible" : ""}`} id="login-error">
              {errorMessage}
            </div>

            <div className="login-footer">
              <span className="login-dot-live" />
              Sistema seguro · Acesso restrito · ALTCHA ativo
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
