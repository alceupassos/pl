"use client";

// Telão de Pleitos 2026 — alterna PRESIDENTE → BRASIL (governadores, Senado,
// Câmara, Assembleias) → GOVERNADOR → SENADOR → DEP. FEDERAL → DEP. ESTADUAL
// da UF escolhida (padrão SP). Antes das 17h mostra os candidatos com contagem
// regressiva; durante a apuração faz polling de /api/telao/apuracao (JSON
// oficial TSE) e anima ranking, barras, votos e o andamento do processo.
// Fotos vêm do proxy /api/telao/foto (cache em disco em data/tse-fotos/).
//
// Querystring: ?int=20 (segundos por tela) &p=senador-sp|brasil (fixa) &uf=rj

import { MapPin, UserRound, Star, X, ArrowRight, Radio, Flag, Sun, Moon } from "lucide-react";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { AmbientVideo } from "@/components/ambient-video";
import { BrazilMap } from "@/components/telao/brazil-map";
import { CampaignMonitor } from "@/components/telao/campaign-monitor";
import { MiniMapaPleito } from "@/components/telao/mini-mapa-pleito";
import { AtivacaoCandidatoModal } from "@/components/telao/ativacao-candidato";
import { useOdometer } from "@/components/mobile/ui/odometer";
import type {
  Apuracao,
  CandApurado,
  CandSnapshot,
  Escopo,
  Municipio,
  PleitoId,
  PleitoSnapshot,
} from "@/lib/telao/tse-apuracao";
import type { Casa, Panorama, UFMajoritario } from "@/lib/telao/tse-nacional";
import { UFS, UF_NOME } from "@/lib/telao/ufs";
import type { BocaDeUrna, BocaPesquisa } from "@/lib/telao/boca-de-urna";
import { MobileNewsTicker } from "./mobile-news-ticker";
import type { Noticia } from "@/lib/telao/noticias";

type Props = {
  variant?: "tv" | "mobile";
  pleitos: PleitoSnapshot[];
  fotoBase: Record<PleitoId, string>;
  meta: { atualizado: string; fonte: string };
};

// Horário unificado de Brasília em todo o país (8h–17h), 1º turno em 04/10/2026.
const ABERTURA = new Date("2026-10-04T08:00:00-03:00").getTime();
const FECHAMENTO = new Date("2026-10-04T17:00:00-03:00").getTime();
// Apuração oficial TSE: atualiza a cada 5 min. Boca de urna (lançada à mão): 30s.
const POLL_MS = 5 * 60_000; // notícias
const POLL_APURACAO_MS = 60_000; // apuração TSE: parciais saem a cada poucos minutos
const POLL_BOCA_MS = 30_000;
const MAJORITARIO_MAX = 20; // presidente/governador/senador: todos os candidatos
const PROPORCIONAL_MAX = 20;

/* ── contagem regressiva: abertura (8h) → fechamento (17h) → apuração ── */
type Fase = { fase: "antes" | "votacao" | "apuracao"; rotulo: string; falta: number; sub: string };

function hms(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function faseEleicao(now: number): Fase {
  if (now && now < ABERTURA)
    return {
      fase: "antes",
      rotulo: "VOTAÇÃO COMEÇA EM",
      falta: ABERTURA - now,
      sub: `urnas abrem 8h · apuração a partir das 17h (em ${hms(FECHAMENTO - now)})`,
    };
  if (now && now < FECHAMENTO)
    return { fase: "votacao", rotulo: "URNAS FECHAM EM", falta: FECHAMENTO - now, sub: "votação em andamento · 8h–17h (Brasília)" };
  return { fase: "apuracao", rotulo: "URNAS FECHADAS", falta: 0, sub: "apuração oficial do TSE" };
}

function Contagem({ now }: { now: number }) {
  if (!now) return null;
  const f = faseEleicao(now);
  return (
    <div className={`pl-contagem pl-contagem-${f.fase}`} title={f.sub} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
      <span className="pl-contagem-lbl">{f.rotulo}</span>
      {f.falta > 0 ? <b className="tl-mono">{hms(f.falta)}</b> : <i className="pl-pulse-dot" />}
    </div>
  );
}

const COR_PARTIDO: Record<string, string> = {
  PT: "#e2252b", PL: "#1f5fbf", REPUBLICANOS: "#2a7de1", PSD: "#f2a900", NOVO: "#f26522",
  MDB: "#2fa84f", PSB: "#f5c400", PSDB: "#2f6db5", "UNIÃO": "#1aa0d8", PP: "#3b6fd1",
  PSOL: "#ffb400", REDE: "#21a39b", PDT: "#c8102e", PODE: "#2db34a", AVANTE: "#e5007d",
  PRTB: "#0a8f3c", "MISSÃO": "#ffcc00", PSTU: "#b5121b", PCO: "#a50000", PCB: "#d10000",
  UP: "#ff4d4d", CIDADANIA: "#e4007c", DC: "#1c75bc", DEMOCRATA: "#1e90ff", AGIR: "#00a99d",
  PV: "#2e9b3e", SOLIDARIEDADE: "#ff7f00", PCDOB: "#d4001f", PRD: "#0b4ea2", MOBILIZA: "#7a3fb0",
};
function corPartido(p: string): string {
  return COR_PARTIDO[p] ?? "#6f7d96";
}

/* ── destaque NEON por partido (multisseleção) ── */
const NEON = ["#39ff14", "#ff2bd6", "#00f0ff", "#fff200", "#ff7a00", "#b026ff"];
const NeonCtx = createContext<Map<string, string>>(new Map());

/** Nome de candidato: em neon se o partido estiver em destaque. */
function Nome({ partido, children, className }: { partido: string; children: string; className: string }) {
  const cor = useContext(NeonCtx).get(partido);
  if (!cor) return <span className={className}>{children}</span>;
  return (
    <span className={`${className} pl-neon`} style={{ color: cor, ["--neon" as string]: cor }}>
      {children}
    </span>
  );
}

/* ── selo do partido: medalhão na cor da legenda com o número na urna ── */
function SeloPartido({ sigla, num, size = "2.6em" }: { sigla: string; num?: string; size?: string }) {
  const cor = corPartido(sigla);
  const txt = num || sigla.slice(0, 3);
  return (
    <svg className="pl-selo" viewBox="0 0 48 48" width={size} height={size} aria-hidden>
      <defs>
        <radialGradient id={`sg-${sigla}`} cx="35%" cy="28%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="23" fill={cor} />
      <circle cx="24" cy="24" r="23" fill={`url(#sg-${sigla})`} />
      <circle cx="24" cy="24" r="19" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" />
      <text
        x="24"
        y="24"
        dy=".36em"
        textAnchor="middle"
        fontSize={txt.length > 2 ? 13 : 19}
        fontWeight="800"
        fill="#fff"
        style={{ fontFamily: "var(--font-sora), system-ui, sans-serif", letterSpacing: "-0.02em" }}
      >
        {txt}
      </text>
    </svg>
  );
}

/** Grade de botões com o selo de cada partido (multisseleção). */
function GradePartidos({
  partidos,
  numeros,
  sel,
  onToggle,
}: {
  partidos: string[];
  numeros: Map<string, string>;
  sel: string[];
  onToggle: (p: string) => void;
}) {
  return (
    <div className="pl-dest-grid" role="group" aria-label="Partidos">
      {partidos.map((p) => {
        const on = sel.includes(p);
        return (
          <button
            key={p}
            type="button"
            className={on ? "on" : ""}
            aria-pressed={on}
            style={{ ["--c" as string]: corPartido(p) }}
            onClick={() => onToggle(p)}
          >
            <i className="pl-party-dot" style={{ background: corPartido(p) }} /><span>{p}</span>
          </button>
        );
      })}
    </div>
  );
}

function SeletorDestaque({
  partidos,
  numeros,
  sel,
  onChange,
  onClose,
}: {
  partidos: string[];
  numeros: Map<string, string>;
  sel: string[];
  onChange: (s: string[]) => void;
  onClose: () => void;
}) {
  const toggle = (p: string) => onChange(sel.includes(p) ? sel.filter((x) => x !== p) : [...sel, p]);
  return (
    <div className="pl-dest-ov">
      <div className="pl-dest-box">
        <h2>Quais partidos destacar?</h2>
        <p>Os candidatos dos partidos escolhidos aparecem destacados em todas as telas. Pode marcar mais de um.</p>
        <GradePartidos partidos={partidos} numeros={numeros} sel={sel} onToggle={toggle} />
        <div className="pl-dest-act">
          <button className="pl-ed-del" onClick={() => { onChange([]); onClose(); }}>
            Sem destaque
          </button>
          <button className="pl-ed-save" onClick={onClose}>
            {sel.length ? `Começar com ${sel.length} em destaque` : "Começar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── registro de entrada: nome + WhatsApp + partidos (sem senha) ── */
function mascaraTel(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function RegistroTelao({
  partidos,
  numeros,
  onDone,
}: {
  partidos: string[];
  numeros: Map<string, string>;
  onDone: (sel: string[]) => void;
}) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const toggle = (p: string) => setSel((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/telao/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp: tel, partidos: sel }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setErro(d.erro || "Não foi possível registrar agora. Tente de novo.");
        return;
      }
      onDone(sel);
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="telao pl-wall pl-reg-wrap" data-tema="wood">
      <form className="pl-reg" onSubmit={enviar}>
        <header className="pl-reg-head">
          <span className="pl-reg-faixa" aria-hidden>
            <i /><i /><i />
          </span>
          <h1>
            Apuração 2026
            <span>ao vivo, candidato a candidato</span>
          </h1>
          <p>Registre-se para acompanhar a central. Sem senha: só nome e WhatsApp.</p>
        </header>
        <div className="pl-reg-campos">
          <label>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              placeholder="Como você quer ser chamado"
              required
              minLength={2}
            />
          </label>
          <label>
            <span>WhatsApp</span>
            <input
              value={tel}
              onChange={(e) => setTel(mascaraTel(e.target.value))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              required
            />
          </label>
        </div>
        <fieldset className="pl-reg-partidos">
          <legend>Escolha seus partidos <small>opcional · destaca os candidatos deles</small></legend>
          <GradePartidos partidos={partidos} numeros={numeros} sel={sel} onToggle={toggle} />
        </fieldset>
        {erro && (
          <p className="pl-reg-erro" role="alert">
            {erro}
          </p>
        )}
        <button className="pl-reg-ok" type="submit" disabled={enviando}>
          {enviando ? "Registrando…" : sel.length ? `Entrar com ${sel.join(" · ")}` : "Entrar na apuração"}
          <ArrowRight size={18} aria-hidden />
        </button>
        <small className="pl-reg-legal">
          Uso interno partidário. Seus dados ficam só nesta central e não são compartilhados.
        </small>
      </form>
    </main>
  );
}

function nf(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}
function pctf(n: number, d = 2): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function brl(n: number): string {
  if (n >= 1e6) return `R$ ${pctf(n / 1e6, 1)} mi`;
  if (n >= 1e3) return `R$ ${pctf(n / 1e3, 0)} mil`;
  return n > 0 ? `R$ ${nf(n)}` : "—";
}
function titulo(nome: string): string {
  return nome.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase());
}
function isProporcional(id: PleitoId): boolean {
  return id === "dep-federal-sp" || id === "dep-estadual-sp";
}

/* ── hooks ── */
// 0 no SSR/hidratação (evita mismatch); o relógio real começa após montar.
function useNow(ms = 1000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

function useApuracao(escopo: Escopo, uf: string): Partial<Record<PleitoId, Apuracao>> {
  // guarda o recorte junto dos dados: ao trocar UF/cidade/zona não exibe o anterior
  const [state, setState] = useState<{ key: string; data: Partial<Record<PleitoId, Apuracao>> }>({
    key: "",
    data: {},
  });
  const { mu, zona } = escopo;
  const key = `${uf}|${mu ?? ""}|${zona ?? ""}`;
  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams();
    if (uf !== "sp") qs.set("uf", uf);
    if (mu) qs.set("mu", mu);
    if (mu && zona) qs.set("zona", zona);
    const load = async () => {
      try {
        const r = await fetch(`/api/telao/apuracao?${qs}`, { cache: "no-store" });
        if (r.ok && alive) setState({ key, data: await r.json() });
      } catch {
        /* mantém o último */
      }
    };
    load();
    const id = setInterval(load, POLL_APURACAO_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [mu, zona, uf, key]);
  return state.key === key ? state.data : {};
}

/* ── painel nacional (27 UFs) ── */
function usePanorama(): Panorama | null {
  const [d, setD] = useState<Panorama | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/telao/nacional", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((x: Panorama | null) => alive && x && setD(x))
        .catch(() => {});
    load();
    // primeira montagem no servidor pode levar ~30s (108 arquivos): tenta de novo logo
    const t = setTimeout(load, 45_000);
    const id = setInterval(load, POLL_APURACAO_MS);
    return () => {
      alive = false;
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);
  return d;
}

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* ── seletor de UF ── */
function SeletorUF({ uf, onClick }: { uf: string; onClick: () => void }) {
  return (
    <div className="pl-filtro pl-uf">
      <button className={`pl-filtro-btn ${uf !== "sp" ? "on" : ""}`} onClick={onClick} title="Estado">
        <span className="pl-filtro-ico">▣</span>
        <span>{uf.toUpperCase()}</span>
      </button>
    </div>
  );
}

/* ── filtro por cidade / zona eleitoral (UF do telão) ── */
function FiltroLocal({
  escopo,
  onChange,
  municipios: propsMunicipios,
  uf,
}: {
  escopo: Escopo;
  onChange: (e: Escopo) => void;
  municipios: Municipio[];
  uf: string;
}) {
  const UF = uf.toUpperCase();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  // fallback: só busca a lista se o pai ainda não tiver os municípios da UF
  const [fallback, setFallback] = useState<{ uf: string; muns: Municipio[] | null }>({ uf: "", muns: null });
  const precisaBuscar = !(propsMunicipios && propsMunicipios.length > 0);

  useEffect(() => {
    if (!precisaBuscar) return;
    let ativo = true;
    fetch(`/api/telao/municipios?uf=${uf.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (ativo) setFallback({ uf, muns: Array.isArray(data) ? data : [] });
      })
      .catch(() => {
        if (ativo) setFallback({ uf, muns: [] });
      });
    return () => {
      ativo = false;
    };
  }, [uf, precisaBuscar]);

  const listaMunicipios = !precisaBuscar ? propsMunicipios : fallback.uf === uf ? (fallback.muns ?? []) : [];
  const carregando = precisaBuscar && fallback.uf !== uf;
  const atual = listaMunicipios.find((m) => m.cd === escopo.mu);
  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    const base = q ? listaMunicipios.filter((m) => semAcento(m.nm).includes(q)) : listaMunicipios;
    return base.slice(0, 100);
  }, [busca, listaMunicipios]);

  const rotulo = atual
    ? `${titulo(atual.nm)}${escopo.zona ? ` · Zona ${Number(escopo.zona)}` : ""}`
    : `Estado de ${UF} · Brasil`;

  return (
    <div className="pl-filtro">
      <button className={`pl-filtro-btn ${atual ? "on" : ""}`} onClick={() => setAberto((a) => !a)}>
        <span className="pl-filtro-ico">◎</span>
        <span>{rotulo}</span>
        <span className="pl-filtro-car">{aberto ? "▴" : "▾"}</span>
      </button>
      {atual && (
        <button className="pl-filtro-x" onClick={() => onChange({})} title="Limpar filtro">
          ✕
        </button>
      )}
      {aberto && (
        <div className="pl-filtro-pop">
          <input
            autoFocus
            placeholder={`Buscar cidade de ${UF}…`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {atual && atual.z.length > 0 && (
            <div className="pl-zonas">
              <span>Zonas de {titulo(atual.nm)}:</span>
              <button
                className={!escopo.zona ? "on" : ""}
                onClick={() => onChange({ mu: atual.cd })}
              >
                Todas
              </button>
              {atual.z.map((z) => (
                <button
                  key={z}
                  className={escopo.zona === z ? "on" : ""}
                  onClick={() => onChange({ mu: atual.cd, zona: z })}
                >
                  {Number(z)}ª
                </button>
              ))}
            </div>
          )}
          <div className="pl-mun-list">
            <button className={!atual ? "on" : ""} onClick={() => { onChange({}); setAberto(false); }}>
              Estado de {UF} (Presidente: Brasil)
            </button>
            {lista.map((m) => (
              <button
                key={m.cd}
                className={m.cd === escopo.mu ? "on" : ""}
                onClick={() => {
                  onChange({ mu: m.cd });
                  setAberto(false);
                }}
              >
                {titulo(m.nm)}
                <em>{m.z.length} {m.z.length === 1 ? "zona" : "zonas"}</em>
              </button>
            ))}
            {carregando && listaMunicipios.length === 0 && (
              <div className="pl-mun-vazio">Carregando municípios do TSE…</div>
            )}
            {!carregando && listaMunicipios.length === 0 && (
              <div className="pl-mun-vazio">Nenhum município disponível</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── peças ── */
function Num({ v, className = "" }: { v: number; className?: string }) {
  const d = useOdometer(v, 1400);
  return <span className={`tl-mono ${className}`}>{nf(d)}</span>;
}
function Pct({ v, className = "" }: { v: number; className?: string }) {
  const d = useOdometer(v, 1400);
  return <span className={`tl-mono ${className}`}>{pctf(d)}%</span>;
}

function extrairSq(fotoUrl?: string): string {
  if (!fotoUrl) return "";
  // formato TSE oficial: .../img/<ano-eleicao>/<sqcand>/<uf>
  const m = fotoUrl.match(/\/(\d{9,15})\/[A-Za-z]{2}(?:$|\?)/);
  if (m) return m[1];
  const parts = fotoUrl.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d{9,15}$/.test(parts[i]) && parts[i] !== "20322002026" && parts[i] !== "2045202024") {
      return parts[i];
    }
  }
  return "";
}

function Foto({
  src,
  nome,
  cor,
  size,
  fallbackSrc,
}: {
  src: string;
  nome: string;
  cor: string;
  size: string;
  fallbackSrc?: string;
}) {
  // estado reiniciado quando a foto muda (ajuste durante o render, sem effect)
  const [st, setSt] = useState({ de: src, atual: src, ok: true });
  if (st.de !== src) setSt({ de: src, atual: src, ok: true });
  const currentSrc = st.de === src ? st.atual : src;
  const ok = st.de === src ? st.ok : true;

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) setSt({ de: src, atual: fallbackSrc, ok: true });
    else setSt({ de: src, atual: currentSrc, ok: false });
  };

  const ini = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("");

  return (
    <span className="pl-foto" style={{ width: size, height: size, borderColor: cor }}>
      {ok && currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentSrc} alt={nome} loading="lazy" onError={handleError} />
      ) : (
        <span className="pl-ini">{ini}</span>
      )}
    </span>
  );
}

function Badge({ c }: { c: CandApurado }) {
  const s = c.situacao.toLowerCase();
  if (s.includes("qp")) return <span className="pl-badge pl-eleito">ELEITO QP</span>;
  if (s.includes("média") || s.includes("media")) return <span className="pl-badge pl-eleito">ELEITO MÉDIA</span>;
  if (c.eleito || s.startsWith("eleito")) return <span className="pl-badge pl-eleito">ELEITO</span>;
  if (s.includes("2º turno") || s.includes("2o turno")) return <span className="pl-badge pl-2t">2º TURNO</span>;
  if (s.includes("suplente")) return <span className="pl-badge pl-sup">SUPLENTE</span>;
  return null;
}

/* ── ripa: barra 3D de madeira com mini faixas verticais (cor do partido) ── */
function Ripa({ v, cor, className = "" }: { v: number; cor: string; className?: string }) {
  return (
    <span className={`pl-ripa ${className}`} aria-hidden>
      <i style={{ width: `${Math.max(0, Math.min(100, v))}%`, ["--c" as string]: cor }} />
    </span>
  );
}

/* ── zoom do candidato: clique em qualquer card abre números e colocação ── */
type ZoomStat = { k: string; v: string; sub?: string; tom?: "alta" | "baixa"; txt?: boolean };
type ZoomAlvo = {
  nome: string;
  nomeUrna?: string;
  partido: string;
  num: string | number;
  foto: string;
  fotoFallback?: string;
  pos: number;
  total: number;
  contexto: string;
  destaque?: { valor: string; rotulo: string };
  barra?: number;
  stats: ZoomStat[];
  badge?: React.ReactNode;
  nota?: string;
};
type ZoomAberto = ZoomAlvo & { rect: { x: number; y: number; w: number; h: number } };
const ZoomCtx = createContext<(alvo: ZoomAlvo, el: HTMLElement) => void>(() => {});

/** Props para tornar um card clicável/teclável que abre o zoom. */
function useClicavel() {
  const abrir = useContext(ZoomCtx);
  return (alvo: () => ZoomAlvo) => ({
    role: "button" as const,
    tabIndex: 0,
    "data-zoom": "",
    onClick: (e: React.MouseEvent<HTMLElement>) => abrir(alvo(), e.currentTarget),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir(alvo(), e.currentTarget);
      }
    },
  });
}

function ord(n: number): string {
  return `${n}º`;
}

/** Números de um candidato na apuração, relativos aos vizinhos de ranking. */
function alvoApurado(c: CandApurado, lista: CandApurado[], ap: Apuracao, vagas: number, prop: boolean): ZoomAlvo {
  const i = Math.max(0, lista.findIndex((x) => x.sq === c.sq));
  const pos = i + 1;
  const lider = lista[0];
  const acima = lista[i - 1];
  const abaixo = lista[i + 1];
  const stats: ZoomStat[] = [{ k: "Votos nominais", v: nf(c.votos) }];
  if (acima)
    stats.push({
      k: `Para alcançar o ${ord(pos - 1)}`,
      v: `${nf(acima.votos - c.votos)} votos`,
      sub: `${pctf(acima.pct - c.pct)} p.p. · ${titulo(acima.nome)}`,
      tom: "baixa",
    });
  if (abaixo)
    stats.push({
      k: `Vantagem sobre o ${ord(pos + 1)}`,
      v: `${nf(c.votos - abaixo.votos)} votos`,
      sub: `${pctf(c.pct - abaixo.pct)} p.p. · ${titulo(abaixo.nome)}`,
      tom: "alta",
    });
  if (pos > 2 && lider)
    stats.push({ k: "Distância do líder", v: `${nf(lider.votos - c.votos)} votos`, sub: `${pctf(lider.pct - c.pct)} p.p. · ${titulo(lider.nome)}` });
  if (prop) {
    const doPartido = lista.filter((x) => x.partido === c.partido);
    const pp = doPartido.findIndex((x) => x.sq === c.sq) + 1;
    stats.push({ k: `No ${c.partido}`, v: `${ord(pp)} de ${doPartido.length}`, sub: "pela votação nominal no partido" });
  } else if (vagas === 1) {
    stats.push(
      c.pct > 50
        ? { k: "1º turno", v: "Acima de 50%", sub: "maioria dos votos válidos", tom: "alta" }
        : { k: "Para 50% + 1", v: `${pctf(50 - c.pct)} p.p.`, sub: "maioria absoluta dos válidos" },
    );
  } else {
    stats.push(
      pos <= vagas
        ? { k: `Vagas em disputa: ${vagas}`, v: "Dentro das vagas", tom: "alta" }
        : { k: `Vagas em disputa: ${vagas}`, v: `Fora · ${ord(pos)}`, sub: lista[vagas - 1] ? `a ${nf(lista[vagas - 1].votos - c.votos)} votos do ${ord(vagas)}` : undefined, tom: "baixa" },
    );
  }
  stats.push({ k: "Urnas apuradas", v: `${pctf(ap.pctUrnas)}%`, sub: ap.hora ? `atualizado ${ap.hora}` : undefined });
  return {
    nome: titulo(c.nome),
    partido: c.partido,
    num: c.num,
    foto: `${ap.fotoBase}/${c.sq}`,
    pos,
    total: lista.length,
    contexto: "na apuração oficial do TSE",
    destaque: { valor: `${pctf(c.pct)}%`, rotulo: "dos votos válidos" },
    barra: lider && lider.pct > 0 ? (c.pct / lider.pct) * 100 : 0,
    stats,
    badge: <Badge c={c} />,
  };
}

function CandidatoZoom({ alvo, onClose, mobile }: { alvo: ZoomAberto; onClose: () => void; mobile: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const toque = useRef<number | null>(null);
  const cor = corPartido(alvo.partido);
  const reduz = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // FLIP: o card nasce no retângulo de origem e cresce até o centro
  const flip = useCallback(
    (reverso: boolean) => {
      const el = cardRef.current;
      if (!el || reduz) return null;
      const r = el.getBoundingClientRect();
      const { x, y, w, h } = alvo.rect;
      const de = `translate(${x - r.left}px, ${y - r.top}px) scale(${w / r.width}, ${h / r.height})`;
      const quadros = [
        { transform: de, opacity: 0.2, borderRadius: "14px" },
        { transform: "none", opacity: 1 },
      ];
      return el.animate(reverso ? [...quadros].reverse() : quadros, {
        duration: reverso ? 320 : 560,
        easing: reverso ? "cubic-bezier(.5,0,.75,0)" : "cubic-bezier(.16,1,.3,1)",
        fill: "both",
      });
    },
    [alvo.rect, reduz],
  );

  useLayoutEffect(() => {
    flip(false);
    fecharRef.current?.focus({ preventScroll: true });
  }, [flip]);

  const fechar = useCallback(() => {
    const a = flip(true);
    if (a) a.onfinish = onClose;
    else onClose();
  }, [flip, onClose]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        fechar();
      }
    };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, [fechar]);

  return (
    <div
      className={`pl-zoom-ov ${mobile ? "pl-zoom-sheet" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${alvo.nome}: números e colocação`}
      onClick={(e) => e.target === e.currentTarget && fechar()}
    >
      <div
        ref={cardRef}
        className="pl-zoom"
        style={{ ["--c" as string]: cor }}
        onTouchStart={(e) => (toque.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (toque.current !== null && e.changedTouches[0].clientY - toque.current > 90) fechar();
          toque.current = null;
        }}
      >
        <button ref={fecharRef} type="button" className="pl-zoom-x" aria-label="Fechar" onClick={fechar}>
          <X size={20} />
        </button>
        <div className="pl-zoom-retrato">
          <Foto src={alvo.foto} fallbackSrc={alvo.fotoFallback} nome={alvo.nome} cor={cor} size="100%" />
          <span className="pl-zoom-num tl-mono" style={{ background: cor }}>{alvo.num}</span>
        </div>
        <div className="pl-zoom-corpo">
          <div className="pl-zoom-id">
            <h2>{alvo.nome}</h2>
            <p>
              <b style={{ color: cor }}>{alvo.partido}</b>
              {alvo.nomeUrna && alvo.nomeUrna !== alvo.nome ? ` · ${alvo.nomeUrna}` : ""}
              {alvo.badge}
            </p>
          </div>
          <div className="pl-zoom-pos">
            <strong className="pl-zoom-ord">
              {alvo.pos}
              <sup>º</sup>
            </strong>
            <span>
              de {nf(alvo.total)}
              <em>{alvo.contexto}</em>
            </span>
            {alvo.destaque && (
              <div className="pl-zoom-dest">
                <b className="tl-mono">{alvo.destaque.valor}</b>
                <small>{alvo.destaque.rotulo}</small>
              </div>
            )}
          </div>
          {alvo.barra !== undefined && (
            <div className="pl-zoom-barra">
              <Ripa v={alvo.barra} cor={cor} className="pl-ripa-xl" />
              <small>em relação ao 1º colocado</small>
            </div>
          )}
          <dl className="pl-zoom-stats">
            {alvo.stats.map((s) => (
              <div key={s.k} className={s.tom ? `pl-tom-${s.tom}` : ""}>
                <dt>{s.k}</dt>
                <dd className={s.txt ? "pl-zoom-txt" : "tl-mono"}>{s.v}</dd>
                {s.sub && <dd className="pl-zoom-sub">{s.sub}</dd>}
              </div>
            ))}
          </dl>
          {alvo.nota && <p className="pl-zoom-nota">{alvo.nota}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── andamento do processo ── */
function Andamento({ ap, now }: { ap?: Apuracao; now: number }) {
  const fase =
    ap?.status === "finalizado" ? 4 : ap?.status === "apurando" ? 3 : now >= FECHAMENTO ? 2 : now >= ABERTURA ? 1 : 0;
  const etapas = ["Abertura 8h", "Votação", "Urnas fechadas 17h", "Totalização TSE", "Resultado final"];
  const pct = ap?.pctUrnas ?? 0;
  return (
    <section className="pl-proc">
      <div className="pl-steps">
        {etapas.map((e, i) => (
          <div key={e} className={`pl-step ${i < fase ? "done" : i === fase ? "now" : ""}`}>
            <span className="pl-dot" />
            <span>{e}</span>
          </div>
        ))}
      </div>
      <div className="pl-urnas">
        <div className="pl-urnas-lbl">
          <span>URNAS APURADAS</span>
          <Pct v={pct} className="pl-urnas-pct" />
        </div>
        <div className="pl-bar">
          <div className="pl-bar-fill" style={{ width: `${Math.max(pct, 0.4)}%` }} />
          {[25, 50, 75].map((m) => (
            <span key={m} className="pl-bar-mark" style={{ left: `${m}%` }} />
          ))}
        </div>
        <div className="pl-urnas-sub tl-mono">
          {ap && ap.secoesTotal > 0
            ? `${nf(ap.secoesTot)} de ${nf(ap.secoesTotal)} seções · atualizado ${ap.hora}`
            : "aguardando a primeira totalização do TSE"}
        </div>
      </div>
      <div className="pl-kpis">
        <div><b>Eleitorado</b><Num v={ap?.eleitorado ?? 0} /></div>
        <div><b>Comparecimento</b><Pct v={ap?.pctComparecimento ?? 0} /></div>
        <div><b>Abstenção</b><Pct v={ap?.pctAbstencao ?? 0} /></div>
        <div><b>Válidos</b><Num v={ap?.votosValidos ?? 0} /></div>
        <div><b>Brancos</b><Pct v={ap?.pctBrancos ?? 0} /></div>
        <div><b>Nulos</b><Pct v={ap?.pctNulos ?? 0} /></div>
        {ap && ap.quocienteEleitoral > 0 ? (
          <>
            <div><b>Legenda</b><Num v={ap.legenda} /></div>
            <div><b>Quociente eleitoral</b><Num v={ap.quocienteEleitoral} /></div>
          </>
        ) : (
          <>
            <div><b>Comparecimento</b><Num v={ap?.comparecimento ?? 0} /></div>
            <div><b>Sub judice</b><Num v={ap?.subJudice ?? 0} /></div>
          </>
        )}
      </div>
    </section>
  );
}

/* ── filtros dos deputados: letra inicial (topo) e partido (rodapé) ── */
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
function inicial(nome: string): string {
  return semAcento(nome.trim()).charAt(0).toUpperCase();
}

function FiltroLetras({ disp, letra, onChange }: { disp: Set<string>; letra: string; onChange: (l: string) => void }) {
  return (
    <nav className="pl-abc" aria-label="Filtrar por letra inicial">
      <button type="button" className={!letra ? "on" : ""} aria-pressed={!letra} onClick={() => onChange("")}>
        Todos
      </button>
      {LETRAS.map((l) => (
        <button
          key={l}
          type="button"
          className={letra === l ? "on" : ""}
          aria-pressed={letra === l}
          disabled={!disp.has(l)}
          onClick={() => onChange(letra === l ? "" : l)}
        >
          {l}
        </button>
      ))}
    </nav>
  );
}

const PARTY_NAMES: Record<string,string> = { PT:"Partido dos Trabalhadores", PL:"Partido Liberal", PP:"Progressistas", PSD:"Partido Social Democrático", PSB:"Partido Socialista Brasileiro", MDB:"Movimento Democrático Brasileiro", PSDB:"Partido da Social Democracia Brasileira", PDT:"Partido Democrático Trabalhista", PSOL:"Partido Socialismo e Liberdade", PV:"Partido Verde", PCdoB:"Partido Comunista do Brasil", PCB:"Partido Comunista Brasileiro", PSTU:"Partido Socialista dos Trabalhadores Unificado", UP:"Unidade Popular", REDE:"Rede Sustentabilidade", REPUBLICANOS:"Republicanos", UNIÃO:"União Brasil", AVANTE:"Avante", NOVO:"Novo", PODE:"Podemos", CIDADANIA:"Cidadania", SOLIDARIEDADE:"Solidariedade" };
function FiltroPartidosMini({
  cont,
  partido,
  onChange,
}: {
  cont: [string, number][];
  partido: string;
  onChange: (p: string) => void;
}) {
  return (
    <nav className="pl-ptd" aria-label="Filtrar por partido">
      <button type="button" className={!partido ? "on" : ""} aria-pressed={!partido} onClick={() => onChange("")}>
        Todos
      </button>
      {cont.map(([p, n]) => (
        <button
          key={p}
          type="button"
          className={partido === p ? "on" : ""}
          aria-pressed={partido === p}
          style={{ ["--c" as string]: corPartido(p) }}
          onClick={() => onChange(partido === p ? "" : p)}
        >
          <i />
          <span title={PARTY_NAMES[p] || p}>{p} · {PARTY_NAMES[p] || p}</span>
          <small className="tl-mono">{n}</small>
        </button>
      ))}
    </nav>
  );
}

function contarPartidos(ps: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const p of ps) m.set(p, (m.get(p) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/* ── ranking majoritário (presidente/governador/senador) ── */
function Majoritario({ ap, vagas }: { ap: Apuracao; vagas: number }) {
  const clicavel = useClicavel();
  const lista = [...ap.cand].sort((a, b) => Number(b.eleito) - Number(a.eleito) || b.votos - a.votos);
  const lider = lista[0];
  const max = Math.max(lider?.pct ?? 1, 1);
  // linhas dividem a altura disponível: cabem todos
  const n = Math.max(lista.length, 6);
  const alvo = (c: CandApurado) => () => alvoApurado(c, lista, ap, vagas, false);
  return (
    <div className="pl-maj">
      {lider && (
        <div className="pl-lider" key={lider.sq} {...clicavel(alvo(lider))}>
          <div className="pl-lider-halo" style={{ background: corPartido(lider.partido) }} />
          <Foto src={`${ap.fotoBase}/${lider.sq}`} nome={lider.nome} cor={corPartido(lider.partido)} size="13em" />
          <div className="pl-lider-tag">{vagas > 1 ? "MAIS VOTADO" : "LIDERANDO"}</div>
          <Nome partido={lider.partido} className="pl-lider-nome">{titulo(lider.nome)}</Nome>
          <div className="pl-lider-part">{lider.partido} · {lider.num}</div>
          <Pct v={lider.pct} className="pl-lider-pct" />
          <div className="pl-lider-vv">dos votos válidos</div>
          <Num v={lider.votos} className="pl-lider-votos" />
          <Badge c={lider} />
        </div>
      )}
      <div className={`pl-rank ${lista.length > 8 ? "pl-rank-compact" : ""}`}>
        <div className="pl-vv-lbl">% dos votos válidos · {nf(ap.votosValidos)} válidos apurados</div>
        {lista.map((c, i) => (
          <div
            key={c.sq}
            className={`pl-row ${i < vagas ? "pl-row-top" : ""}`}
            style={{ top: `calc(${i} * 100% / ${n})`, height: `calc(100% / ${n} - 0.35em)` }}
            {...clicavel(alvo(c))}
          >
            <span className="pl-pos tl-mono">{i + 1}º</span>
            <Foto
              src={`${ap.fotoBase}/${c.sq}`}
              nome={c.nome}
              cor={corPartido(c.partido)}
              size={lista.length > 8 ? "2.5em" : "3.6em"}
            />
            <div className="pl-row-main">
              <div className="pl-row-top-line">
                <Nome partido={c.partido} className="pl-row-nome">{titulo(c.nome)}</Nome>
                <span className="pl-row-part" style={{ color: corPartido(c.partido) }}>{c.partido}</span>
                <Badge c={c} />
              </div>
              <div className="pl-row-bar">
                <div
                  className="pl-row-fill"
                  style={{ width: `${(c.pct / max) * 100}%`, background: corPartido(c.partido), ["--c" as string]: corPartido(c.partido) }}
                />
              </div>
            </div>
            <div className="pl-row-num">
              <Pct v={c.pct} className="pl-row-pct" />
              <Num v={c.votos} className="pl-row-votos" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ranking proporcional (deputados): todos os candidatos com cards compactos ── */
function Proporcional({ ap, vagas }: { ap: Apuracao; vagas: number }) {
  const clicavel = useClicavel();
  const [busca, setBusca] = useState("");
  const [letra, setLetra] = useState("");
  const [partido, setPartido] = useState("");
  const todos = useMemo(() => {
    return [...ap.cand].sort((a, b) => Number(b.eleito) - Number(a.eleito) || b.votos - a.votos);
  }, [ap.cand]);
  const maxVotos = Math.max(1, todos[0]?.votos ?? 1);
  const letras = useMemo(() => new Set(todos.map((c) => inicial(c.nome))), [todos]);
  const cont = useMemo(() => contarPartidos(todos.map((c) => c.partido)), [todos]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todos.filter(
      (c) =>
        (!letra || inicial(c.nome) === letra) &&
        (!partido || c.partido === partido) &&
        (!q || c.nome.toLowerCase().includes(q) || String(c.num).includes(q) || c.partido.toLowerCase().includes(q)),
    );
  }, [todos, busca, letra, partido]);

  return (
    <div className="pl-prop">
      <div className="pl-prop-head">
        <span><b>{nf(lista.length)}</b> de {nf(todos.length)} candidatos · % dos votos válidos</span>
        <span className="pl-prop-vagas">{vagas} cadeiras</span>
        <input
          type="search"
          className="pl-busca"
          placeholder="Buscar deputado, número ou partido"
          aria-label="Buscar deputado"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <FiltroLetras disp={letras} letra={letra} onChange={setLetra} />
      <div className="pl-prop-grid">
        {lista.map((c) => {
          const pos = todos.indexOf(c) + 1;
          const cor = corPartido(c.partido);
          return (
            <div
              key={c.sq || `${c.num}-${c.nome}`}
              className="pl-pcard pl-pcard-compact"
              {...clicavel(() => alvoApurado(c, todos, ap, vagas, true))}
            >
              <span className="pl-pos tl-mono">{pos}</span>
              <Foto src={`${ap.fotoBase}/${c.sq}`} nome={c.nome} cor={cor} size="2.4em" />
              <div className="pl-pcard-main">
                <Nome partido={c.partido} className="pl-row-nome">{titulo(c.nome)}</Nome>
                <span className="pl-row-part" style={{ color: cor }}>
                  {c.partido} · {c.num}
                </span>
                <Badge c={c} />
              </div>
              <div className="pl-row-num">
                <Num v={c.votos} className="pl-row-pct" />
                <Pct v={c.pct} className="pl-row-votos" />
              </div>
              <Ripa v={(c.votos / maxVotos) * 100} cor={cor} className="pl-ripa-card" />
            </div>
          );
        })}
        {lista.length === 0 && <p className="pl-vazio">Nenhum deputado com esse filtro.</p>}
      </div>
      <FiltroPartidosMini cont={cont} partido={partido} onChange={setPartido} />
    </div>
  );
}

/* ── pré-apuração: vitrine dos candidatos ── */
type ItemVit = { c: CandSnapshot; pct?: number; fora: boolean; destaque: boolean };

function fotoVitrine(p: PleitoSnapshot, c: CandSnapshot): string {
  const isPres = p.id === "presidente" || (p.uf && p.uf.toUpperCase() === "BR");
  const sq = extrairSq(c.foto);
  if (sq) return `/api/telao/foto/${isPres ? "6257" : "6259"}/${isPres ? "br" : (p.uf || "sp").toLowerCase()}/${sq}`;
  return c.foto && c.foto.startsWith("http") ? c.foto : "";
}

function alvoVitrine(p: PleitoSnapshot, it: ItemVit, ordem: number, total: number, pesquisa?: BocaPesquisa): ZoomAlvo {
  const { c, pct } = it;
  const stats: ZoomStat[] = [];
  let pos = ordem;
  let tot = total;
  let barra: number | undefined;
  if (pesquisa && pct !== undefined) {
    const rank = [...pesquisa.cand].sort((a, b) => b.pct - a.pct);
    const i = rank.findIndex((x) => Number(x.num) === c.num);
    pos = i + 1;
    tot = rank.length;
    barra = rank[0]?.pct ? (pct / rank[0].pct) * 100 : 0;
    const acima = rank[i - 1];
    const abaixo = rank[i + 1];
    const empate = (o?: { pct: number }) => !!o && Math.abs(o.pct - pct) <= 2 * pesquisa.margem;
    if (acima)
      stats.push({
        k: `Atrás do ${ord(pos - 1)}`,
        v: `${pctf(acima.pct - pct, 1)} p.p.`,
        sub: `${titulo(acima.nome)}${empate(acima) ? " · empate técnico" : ""}`,
        tom: empate(acima) ? undefined : "baixa",
      });
    if (abaixo)
      stats.push({
        k: `À frente do ${ord(pos + 1)}`,
        v: `${pctf(pct - abaixo.pct, 1)} p.p.`,
        sub: `${titulo(abaixo.nome)}${empate(abaixo) ? " · empate técnico" : ""}`,
        tom: empate(abaixo) ? undefined : "alta",
      });
    stats.push({ k: "Margem de erro", v: `±${pctf(pesquisa.margem, 1)} p.p.`, sub: pesquisa.fonte || pesquisa.instituto });
  }
  stats.push({ k: "Número na urna", v: String(c.num) });
  if (c.col) stats.push({ k: "Coligação / federação", v: titulo(c.col), txt: true });
  if (c.occ) stats.push({ k: "Ocupação", v: titulo(c.occ), txt: true });
  return {
    nome: titulo(c.n),
    nomeUrna: titulo(c.nome),
    partido: c.p,
    num: c.num,
    foto: fotoVitrine(p, c),
    fotoFallback: c.foto,
    pos,
    total: tot,
    contexto: pct !== undefined ? "na pesquisa de intenção de voto" : "na lista exibida",
    destaque: pct !== undefined ? { valor: `${pctf(pct, 1)}%`, rotulo: "das intenções de voto" } : undefined,
    barra,
    stats,
    nota: "Apuração oficial do TSE a partir das 17h. Antes disso, a colocação vem da pesquisa.",
  };
}

/** Pódio da pesquisa: colunas 3D com a foto no topo de cada barra. */
function PodioPesquisa({ p, itens, pesquisa }: { p: PleitoSnapshot; itens: ItemVit[]; pesquisa: BocaPesquisa }) {
  const clicavel = useClicavel();
  const col = itens.filter((x) => x.pct !== undefined).slice(0, 10);
  if (col.length < 2) return null;
  const max = Math.max(...col.map((x) => x.pct!), 1);
  return (
    <div className="pl-podio" aria-label={`Pesquisa ${pesquisa.fonte || pesquisa.instituto}`}>
      {col.map((it, i) => {
        const cor = corPartido(it.c.p);
        return (
          <div
            key={it.c.num}
            className="pl-podio-col"
            style={{ ["--c" as string]: cor, ["--h" as string]: String(it.pct! / max), animationDelay: `${i * 70}ms` }}
            {...clicavel(() => alvoVitrine(p, it, i + 1, col.length, pesquisa))}
          >
            <div className="pl-podio-trilho">
              <div className="pl-podio-barra">
                <span className="pl-podio-foto">
                  <Foto src={fotoVitrine(p, it.c)} fallbackSrc={it.c.foto} nome={it.c.n} cor={cor} size="100%" />
                </span>
                <b className="pl-podio-pct tl-mono">{pctf(it.pct!, 1)}%</b>
              </div>
            </div>
            <span className="pl-podio-nome">{titulo(it.c.n)}</span>
            <span className="pl-podio-part" style={{ color: cor }}>{it.c.p}</span>
          </div>
        );
      })}
    </div>
  );
}

function Vitrine({
  p,
  now,
  pesquisa,
}: {
  p: PleitoSnapshot;
  fotoBase: string;
  now: number;
  pesquisa?: BocaPesquisa;
}) {
  const prop = isProporcional(p.id);
  const neon = useContext(NeonCtx);
  const clicavel = useClicavel();
  const [busca, setBusca] = useState("");
  const [letra, setLetra] = useState("");
  const [partido, setPartido] = useState("");

  const todos = useMemo<ItemVit[]>(() => {
    const pctDe = (num: number) => pesquisa?.cand.find((c) => Number(c.num) === num)?.pct;
    const desistiu = (st: string) => /desist|ren[uú]n/i.test(st);
    return p.candidatos
      .filter((c, i, a) => a.findIndex((x) => x.num === c.num) === i)
      .map((c) => ({ c, pct: pctDe(c.num), fora: desistiu(c.st), destaque: neon.has(c.p) }))
      .sort((a, b) => {
        if (a.fora !== b.fora) return Number(a.fora) - Number(b.fora);
        const hasA = a.pct !== undefined;
        const hasB = b.pct !== undefined;
        if (hasA && hasB) return b.pct! - a.pct!;
        if (hasA !== hasB) return hasA ? -1 : 1;
        if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
        return a.c.n.localeCompare(b.c.n, "pt-BR");
      });
  }, [p.candidatos, pesquisa, neon]);

  const maxPct = Math.max(1, ...todos.map((t) => t.pct ?? 0));
  const letras = useMemo(() => new Set(todos.map((t) => inicial(t.c.n))), [todos]);
  const cont = useMemo(() => contarPartidos(todos.map((t) => t.c.p)), [todos]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todos.filter(
      ({ c }) =>
        (!letra || inicial(c.n) === letra) &&
        (!partido || c.p === partido) &&
        (!q ||
          c.nome.toLowerCase().includes(q) ||
          c.n.toLowerCase().includes(q) ||
          String(c.num).includes(q) ||
          c.p.toLowerCase().includes(q)),
    );
  }, [todos, busca, letra, partido]);

  return (
    <div className={`pl-vit ${prop ? "pl-vit-deps" : ""}`}>
      <div className="pl-count">
        <Contagem now={now} />
        <em>
          <b>{nf(lista.length)}</b> de {nf(p.total)} candidatos · {p.vagas} {p.vagas > 1 ? "vagas" : "vaga"}
          {pesquisa ? ` · ordem da pesquisa ${pesquisa.fonte || pesquisa.instituto}` : ""}
        </em>
        <input
          type="search"
          className="pl-busca"
          placeholder="Buscar candidato, número ou partido"
          aria-label="Buscar candidato"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      {!prop && pesquisa && <PodioPesquisa p={p} itens={todos} pesquisa={pesquisa} />}
      {prop && <div className="pl-filter-combined"><FiltroLetras disp={letras} letra={letra} onChange={setLetra} /><FiltroPartidosMini cont={cont} partido={partido} onChange={setPartido} /></div>}
      <div className={`pl-vit-grid ${prop ? "pl-vit-prop" : ""}`}>
        {lista.map((it, idx) => {
          const { c, pct, fora, destaque } = it;
          const cor = corPartido(c.p);
          const posPesq = pesquisa && pct !== undefined ? pesquisa.cand.filter((x) => x.pct > pct).length + 1 : 0;
          return (
            <div
              key={`${c.num}-${c.nome}`}
              className={`pl-vcard ${prop ? "pl-vcard-compact" : ""} ${fora ? "pl-vcard-fora" : ""} ${destaque ? "pl-vcard-destaque" : ""}`}
              style={{ ["--c" as string]: cor }}
              {...clicavel(() => alvoVitrine(p, it, idx + 1, lista.length, pesquisa))}
            >
              {pct !== undefined ? (
                <div className="pl-vpesq">
                  <b className="tl-mono">{pctf(pct, 1)}%</b>
                  <span>{posPesq > 0 ? `${posPesq}º na pesquisa` : "na pesquisa"}</span>
                </div>
              ) : (
                !prop && (
                  <div className="pl-vpesq pl-vpesq-vazio">
                    <span className="pl-vpesq-sub">sem percentual informado</span>
                  </div>
                )
              )}
              <Foto src={fotoVitrine(p, c)} fallbackSrc={c.foto} nome={c.n} cor={cor} size={prop ? "2.9em" : "5.4em"} />
              <div className="pl-vnum tl-mono" style={{ background: cor }}>
                {c.num}
              </div>
              <Nome partido={c.p} className="pl-vnome">
                {titulo(c.n)}
              </Nome>
              <div className="pl-vpart" style={{ color: cor }}>
                {c.p}
              </div>
              {!prop && c.occ && <div className="pl-vocc">{titulo(c.occ)}</div>}
              {pct !== undefined && <Ripa v={(pct / maxPct) * 100} cor={cor} className="pl-ripa-card" />}
            </div>
          );
        })}
        {lista.length === 0 && <p className="pl-vazio">{p.statusFonte === "erro" || (!p.candidatos.length && p.uf !== "SP") ? "Cadastro indisponível nesta UF. Não significa ausência de candidatos." : "Nenhum candidato com esse filtro."}</p>}
      </div>

    </div>
  );
}

/* ── notícias (ticker) ── */
function useNoticias(): Noticia[] {
  const [n, setN] = useState<Noticia[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/telao/noticias", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .then((x: Noticia[]) => alive && x.length && setN(x))
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return n;
}

/* ── boca de urna ── */
function useBoca(tipo: "boca" | "pesquisa" = "boca", uf = "sp"): BocaDeUrna {
  const [d, setD] = useState<BocaDeUrna>({});
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/api/telao/boca-de-urna?tipo=${tipo}&uf=${uf}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : {}))
        .then((x: BocaDeUrna) => alive && setD(x))
        .catch(() => {});
    load();
    const id = setInterval(load, POLL_BOCA_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [tipo, uf]);
  if (uf !== "sp") { const scoped = { ...d }; delete scoped["governador-sp"]; delete scoped["senador-sp"]; return scoped; }
  return d;
}

function temBoca(id: PleitoId, b: BocaDeUrna): boolean {
  return (b[id as keyof BocaDeUrna] as BocaPesquisa | undefined)?.cand?.length ? true : false;
}

function BocaScene({
  pesquisa,
  p,
  ap,
  fotoBase,
}: {
  pesquisa?: BocaPesquisa;
  p: PleitoSnapshot;
  ap?: Apuracao;
  fotoBase: string;
}) {
  if (!pesquisa || pesquisa.cand.length === 0) {
    return (
      <div className="pl-boca-vazio">
        <div className="pl-boca-tag">PESQUISA DE BOCA DE URNA</div>
        <p>Aguardando divulgação dos institutos (a partir das 17h).</p>
        <em>Lance os números em /telao/boca-de-urna assim que saírem.</em>
      </div>
    );
  }
  const lista = pesquisa.cand.slice(0, 7);
  const max = Math.max(...lista.map((c) => c.pct + pesquisa.margem), 10);
  const apurando = !!ap && ap.status !== "aguardando" && ap.cand.length > 0;
  const real = new Map((ap?.cand ?? []).map((c) => [c.num, c]));
  const sqDe = (num: number) =>
    p.candidatos.find((c) => c.num === num)?.foto.match(/\/(\d{9,})\/[A-Z]{2}$/)?.[1] ?? "";

  return (
    <div className="pl-boca">
      <div className="pl-boca-head">
        <span className="pl-boca-tag">BOCA DE URNA</span>
        <b>{pesquisa.instituto || "Instituto"}</b>
        <span>divulgada às {pesquisa.divulgadoEm || "—"}</span>
        <span>margem ±{pctf(pesquisa.margem, 1)} p.p.</span>
        {pesquisa.entrevistas > 0 && <span>{nf(pesquisa.entrevistas)} entrevistas</span>}
        {pesquisa.fonte && <span className="pl-boca-fonte">{pesquisa.fonte}</span>}
        {apurando && (
          <span className="pl-boca-cmp">
            <i className="pl-leg pl-leg-boca" /> boca de urna <i className="pl-leg pl-leg-real" /> apuração TSE (
            {pctf(ap!.pctUrnas, 1)}% urnas)
          </span>
        )}
      </div>
      <div className="pl-cols">
        {lista.map((c, i) => {
          const cor = corPartido(c.partido);
          const r = real.get(String(c.num));
          const delta = r ? r.pct - c.pct : 0;
          const dentro = r ? Math.abs(delta) <= pesquisa.margem : false;
          const sq = r?.sq || sqDe(c.num);
          return (
            <div key={c.num} className="pl-col" style={{ animationDelay: `${i * 110}ms` }}>
              <div className="pl-col-num">
                <Pct v={c.pct} className="pl-col-pct" />
                {r && (
                  <span className={`pl-col-delta ${dentro ? "ok" : "ko"}`}>
                    TSE {pctf(r.pct, 1)}% {delta >= 0 ? "▲" : "▼"}
                    {pctf(Math.abs(delta), 1)}
                  </span>
                )}
              </div>
              <div className="pl-col-area">
                <div
                  className="pl-col-margem"
                  style={{
                    bottom: `${(Math.max(c.pct - pesquisa.margem, 0) / max) * 100}%`,
                    height: `${((Math.min(c.pct + pesquisa.margem, max) - Math.max(c.pct - pesquisa.margem, 0)) / max) * 100}%`,
                  }}
                />
                <div
                  className="pl-col-bar"
                  style={{ height: `${(c.pct / max) * 100}%`, background: `linear-gradient(180deg, ${cor}, ${cor}55)`, animationDelay: `${i * 110}ms` }}
                />
                {r && <div className="pl-col-real" style={{ height: `${(Math.min(r.pct, max) / max) * 100}%` }} />}
              </div>
              <Foto src={sq ? `${fotoBase}/${sq}` : ""} nome={c.nome} cor={cor} size="5em" />
              <Nome partido={c.partido} className="pl-col-nome">{titulo(c.nome)}</Nome>
              <div className="pl-col-part" style={{ color: cor }}>
                {c.partido} · {c.num}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── barra fixa: posição dos candidatos em destaque no pleito atual ── */
type PosItem = { nome: string; partido: string; pos: number; pct: number; votos?: number };

function PosicaoBar({
  p,
  ap,
  pesquisa,
  ehBoca,
}: {
  p: PleitoSnapshot;
  ap?: Apuracao;
  pesquisa?: BocaPesquisa;
  ehBoca: boolean;
}) {
  const neon = useContext(NeonCtx);
  const fonte = ehBoca ? "boca de urna" : "apuração TSE";
  let ranking: PosItem[] = [];
  if (ehBoca && pesquisa) {
    ranking = pesquisa.cand.map((c, i) => ({ nome: c.nome, partido: c.partido, pos: i + 1, pct: c.pct }));
  } else if (ap && ap.status !== "aguardando") {
    ranking = ap.cand.map((c, i) => ({ nome: c.nome, partido: c.partido, pos: i + 1, pct: c.pct, votos: c.votos }));
  }
  const corte = ranking[p.vagas - 1]; // último dentro das vagas (nominal)
  const proxFora = ranking[p.vagas];
  const alvo = neon.size ? ranking.filter((c) => neon.has(c.partido)) : ranking.slice(0, 3);
  const mostra = alvo.slice(0, isProporcional(p.id) ? 6 : 4);

  // pré-apuração: candidatos do partido em destaque, ainda sem posição
  const pre =
    ranking.length === 0
      ? p.candidatos
          .filter((c, i, a) => (neon.size ? neon.has(c.p) : i < 3) && a.findIndex((x) => x.num === c.num) === i)
          .slice(0, 6)
      : [];

  return (
    <div className="pl-posbar">
      <span className="pl-posbar-lbl">
        {neon.size ? "★ EM DESTAQUE" : "POSIÇÕES"} · {p.titulo.replace(" · SP", "")}
        <em>{ranking.length ? fonte : "aguardando apuração"}</em>
      </span>
      <div className="pl-posbar-items">
        {ranking.length > 0 && mostra.length === 0 && (
          <span className="pl-posbar-vazio">nenhum candidato dos partidos em destaque neste pleito</span>
        )}
        {mostra.map((c) => {
          const dentro = c.pos <= p.vagas;
          const gap = dentro
            ? proxFora
              ? `+${pctf(c.pct - proxFora.pct, 1)} p.p. sobre o ${p.vagas + 1}º`
              : ""
            : corte
              ? `a ${pctf(corte.pct - c.pct, 1)} p.p. do ${p.vagas}º`
              : "";
          const cor = neon.get(c.partido);
          return (
            <div key={`${c.nome}-${c.partido}`} className={`pl-pos-item ${dentro ? "in" : "out"}`}>
              <b className="pl-pos-rank tl-mono">{c.pos}º</b>
              <Nome partido={c.partido} className="pl-pos-nome">
                {titulo(c.nome)}
              </Nome>
              <span className="pl-pos-part" style={cor ? { color: cor } : undefined}>
                {c.partido}
              </span>
              <span className="pl-pos-pct tl-mono">{pctf(c.pct, 1)}%</span>
              {c.votos !== undefined && <span className="pl-pos-votos tl-mono">{nf(c.votos)}</span>}
              <span className="pl-pos-gap">{dentro ? (isProporcional(p.id) ? "posição de vaga" : p.vagas > 1 ? "dentro das vagas" : "lidera") : "fora"}{gap ? ` · ${gap}` : ""}</span>
              <span className="pl-pos-meter">
                <i style={{ width: `${Math.min(100, (c.pct / Math.max(ranking[0]?.pct ?? 1, 1)) * 100)}%` }} />
              </span>
            </div>
          );
        })}
        {pre.map((c) => (
          <div key={`${c.num}-${c.nome}`} className="pl-pos-item">
            <b className="pl-pos-rank tl-mono">—</b>
            <Nome partido={c.p} className="pl-pos-nome">
              {titulo(c.n)}
            </Nome>
            <span className="pl-pos-part">{c.p} · {c.num}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── corrida: passo a passo em linha, bolinha (foto + nome) por candidato ── */
type Rastro = Record<string, number[]>; // sq → % válidos em cada atualização

function rastroDe(ap?: Apuracao): Rastro {
  const out: Rastro = {};
  for (const h of ap?.historico ?? []) for (const [sq, v] of Object.entries(h.c)) (out[sq] ??= []).push(v);
  for (const k of Object.keys(out)) out[k] = out[k].slice(-12);
  return out;
}

/* ── evolução: gráfico de linhas (x = % urnas, y = % válidos) ── */
function curva(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  // Catmull-Rom → Bézier: curva suave que passa por todos os pontos
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function Evolucao({ p, ap }: { p: PleitoSnapshot; ap?: Apuracao }) {
  const prop = isProporcional(p.id);
  const hist = ap?.historico ?? [];
  const top = (ap?.cand ?? []).slice(0, prop ? 8 : 6);
  if (!ap || ap.status === "aguardando" || top.length === 0) {
    return (
      <div className="pl-boca-vazio">
        <div className="pl-boca-tag pl-evo-tag">EVOLUÇÃO DA APURAÇÃO</div>
        <p>O gráfico começa com a primeira totalização do TSE.</p>
        <em>Um ponto novo a cada atualização oficial (5 min): as linhas sobem e descem conforme as urnas chegam.</em>
      </div>
    );
  }
  const vals = hist.flatMap((h) => top.map((c) => h.c[c.sq]).filter((v): v is number => v !== undefined));
  const vmax = Math.max(...vals, ...top.map((c) => c.pct), 1);
  const vmin = Math.min(...vals, ...top.map((c) => c.pct), 0);
  const pad = (vmax - vmin) * 0.12 || 1;
  const y0 = Math.max(0, vmin - pad);
  const y1 = vmax + pad;
  const X = (u: number) => (u / 100) * 100; // % da largura
  const Y = (v: number) => (1 - (v - y0) / (y1 - y0)) * 100; // % da altura
  const ticks = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);

  // evita sobreposição das etiquetas finais: empurra para baixo se colidirem
  const finais = top
    .map((c) => ({ c, y: Y(c.pct) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < finais.length; i++) if (finais[i].y - finais[i - 1].y < 7) finais[i].y = finais[i - 1].y + 7;

  return (
    <div className="pl-evo">
      <div className="pl-evo-head">
        <span className="pl-boca-tag pl-evo-tag">EVOLUÇÃO DA APURAÇÃO</span>
        <span>% dos votos válidos × % de urnas apuradas · {hist.length} {hist.length === 1 ? "atualização" : "atualizações"}</span>
      </div>
      <div className="pl-evo-plot">
        <div className="pl-evo-yaxis">
          {ticks.map((t) => (
            <span key={t} className="tl-mono" style={{ top: `${Y(t)}%` }}>
              {pctf(t, 1)}%
            </span>
          ))}
        </div>
        <div className="pl-evo-area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pl-evo-svg">
            {ticks.map((t) => (
              <line key={t} x1="0" x2="100" y1={Y(t)} y2={Y(t)} className="pl-evo-grid" />
            ))}
            {[25, 50, 75].map((u) => (
              <line key={u} x1={X(u)} x2={X(u)} y1="0" y2="100" className="pl-evo-grid" />
            ))}
            {!prop && y0 < 50 && y1 > 50 && (
              <line x1="0" x2="100" y1={Y(50)} y2={Y(50)} className="pl-evo-50" />
            )}
            {top.map((c, i) => {
              const pts = hist
                .filter((h) => h.c[c.sq] !== undefined)
                .map((h) => [X(h.urnas), Y(h.c[c.sq])] as [number, number]);
              const cor = corPartido(c.partido);
              return (
                <g key={c.sq} style={{ animationDelay: `${i * 150}ms` }} className="pl-evo-serie">
                  <path d={curva(pts)} stroke={cor} className="pl-evo-linha" />
                  {pts.map(([px, py], j) => (
                    <circle key={j} cx={px} cy={py} r="0.55" fill={cor} className="pl-evo-pt" />
                  ))}
                </g>
              );
            })}
          </svg>
          {finais.map(({ c, y }) => {
            const cor = corPartido(c.partido);
            return (
              <div key={c.sq} className="pl-evo-fim" style={{ left: `${X(ap.pctUrnas)}%`, top: `${y}%` }}>
                <Foto src={`${ap.fotoBase}/${c.sq}`} nome={c.nome} cor={cor} size="2.2em" />
                <div className="pl-bola-lbl">
                  <Nome partido={c.partido} className="pl-bola-nome">
                    {titulo(c.nome)}
                  </Nome>
                  <span className="tl-mono" style={{ color: cor }}>
                    {pctf(c.pct, 2)}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="pl-evo-xaxis">
            {[0, 25, 50, 75, 100].map((u) => (
              <span key={u} className="tl-mono" style={{ left: `${u}%` }}>
                {u}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const MARCOS_URNAS = [10, 25, 50, 75, 90, 100];

function Corrida({
  p,
  ap,
  fotoBase,
  rastro,
}: {
  p: PleitoSnapshot;
  ap?: Apuracao;
  fotoBase: string;
  rastro: Rastro;
}) {
  const prop = isProporcional(p.id);
  const temRes = !!ap && ap.status !== "aguardando" && ap.cand.length > 0;
  const urnas = ap?.pctUrnas ?? 0;
  const clicavel = useClicavel();
  const ordenados = temRes ? [...ap!.cand].sort((a, b) => b.votos - a.votos) : [];

  type Raia = { key: string; nome: string; partido: string; num: string; pct: number; foto: string; sq: string };
  const raias: Raia[] = temRes
    ? ap!.cand.slice(0, prop ? 10 : 8).map((c) => ({
        key: c.sq,
        sq: c.sq,
        nome: c.nome,
        partido: c.partido,
        num: c.num,
        pct: c.pct,
        foto: `${ap!.fotoBase}/${c.sq}`,
      }))
    : p.candidatos
        .filter((c, i, a) => a.findIndex((x) => x.num === c.num) === i)
        .slice(0, prop ? 10 : 8)
        .map((c) => {
          const sq = c.foto.match(/\/(\d{9,})\/[A-Z]{2}$/)?.[1] ?? "";
          return { key: `${c.num}`, sq, nome: c.n, partido: c.p, num: String(c.num), pct: 0, foto: sq ? `${fotoBase}/${sq}` : "" };
        });

  // escala: majoritário até 60% (marca de 50% = vence no 1º turno); proporcional pelo líder
  const lider = raias[0]?.pct ?? 0;
  const escala = prop ? Math.max(lider * 1.15, 1) : Math.max(60, lider * 1.1);
  const x = (v: number) => `${Math.min(100, (v / escala) * 100)}%`;
  const marcas = prop
    ? [0.25, 0.5, 0.75, 1].map((f) => Math.round(escala * f * 10) / 10)
    : [10, 20, 30, 40, 50];

  return (
    <div className="pl-corrida">
      <div className="pl-pista">
        <div className="pl-escala">
          {marcas.map((m) => (
            <div key={m} className={`pl-marca ${!prop && m === 50 ? "pl-marca-50" : ""}`} style={{ left: x(m) }}>
              <span className="tl-mono">{pctf(m, prop ? 1 : 0)}%</span>
              {!prop && m === 50 && <em>vence no 1º turno</em>}
            </div>
          ))}
        </div>
        {raias.map((r, i) => {
          const cor = corPartido(r.partido);
          const hist = rastro[r.sq] ?? [];
          return (
            <div key={r.key} className="pl-raia" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="pl-raia-pos tl-mono">{temRes ? `${i + 1}º` : r.num}</span>
              <div className="pl-raia-linha">
                <div className="pl-raia-fill" style={{ width: x(r.pct), background: `linear-gradient(90deg, transparent, ${cor})` }} />
                {hist.slice(0, -1).map((h, j) => (
                  <i key={j} className="pl-raia-rastro" style={{ left: x(h), background: cor, opacity: 0.25 + (j / hist.length) * 0.5 }} />
                ))}
                <div
                  className="pl-bola"
                  style={{ left: `max(1.45em, ${x(r.pct)})` }}
                  {...(temRes
                    ? clicavel(() => {
                        const c = ordenados.find((o) => o.sq === r.sq) ?? ordenados[i];
                        return alvoApurado(c, ordenados, ap!, p.vagas, prop);
                      })
                    : {})}
                >
                  <Foto src={r.foto} nome={r.nome} cor={cor} size="2.9em" />
                  <div className="pl-bola-lbl">
                    <Nome partido={r.partido} className="pl-bola-nome">
                      {titulo(r.nome)}
                    </Nome>
                    <span className="tl-mono" style={{ color: cor }}>
                      {r.partido} · {pctf(r.pct, 1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!temRes && <div className="pl-largada">LARGADA · as bolinhas avançam a cada atualização oficial do TSE (5 min)</div>}
    </div>
  );
}

/* ── bancadas (proporcionais): cadeiras por partido/federação ── */
function Bancadas({ p, ap }: { p: PleitoSnapshot; ap?: Apuracao }) {
  const neon = useContext(NeonCtx);
  const partidos = (ap?.partidos ?? []).filter((x) => x.total > 0 || x.vagas > 0);
  const vagas = ap?.vagas || p.vagas;
  if (!ap || ap.status === "aguardando" || partidos.length === 0) {
    return (
      <div className="pl-boca-vazio">
        <div className="pl-boca-tag pl-evo-tag">BANCADAS · {vagas} CADEIRAS</div>
        <p>A distribuição de cadeiras aparece com a primeira totalização.</p>
        <em>Quociente eleitoral, votos nominais + legenda e cadeiras por partido/federação.</em>
      </div>
    );
  }
  const oficial = partidos.some((x) => x.vagasOficial);
  const comVaga = partidos.filter((x) => x.vagas > 0);
  // hemiciclo: cadeiras ordenadas por partido (maior bancada primeiro)
  const cadeiras = comVaga.flatMap((x) => Array.from({ length: x.vagas }, () => x.sigla));
  const fileiras = vagas > 80 ? 6 : 5;
  const raio = (f: number) => 40 + f * 11;
  const porFileira = Array.from({ length: fileiras }, (_, f) => raio(f));
  const somaR = porFileira.reduce((a, b) => a + b, 0);
  const qtd = porFileira.map((r) => Math.round((r / somaR) * vagas));
  qtd[fileiras - 1] += vagas - qtd.reduce((a, b) => a + b, 0);
  const pos: { x: number; y: number; ang: number }[] = [];
  qtd.forEach((n, f) => {
    for (let i = 0; i < n; i++) {
      const ang = Math.PI - (Math.PI * (i + 0.5)) / n;
      pos.push({ x: 110 + raio(f) * Math.cos(ang), y: 110 - raio(f) * Math.sin(ang), ang });
    }
  });
  pos.sort((a, b) => b.ang - a.ang);
  const max = Math.max(...partidos.map((x) => x.total), 1);

  return (
    <div className="pl-banc">
      <div className="pl-banc-hemi">
        <svg viewBox="0 0 220 118">
          {pos.map((c, i) => {
            const sg = cadeiras[i];
            const cor = sg ? corPartido(sg) : "#1b2230";
            const n = sg ? neon.get(sg) : undefined;
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={vagas > 80 ? 3.4 : 3.9}
                fill={cor}
                stroke={n ?? "none"}
                strokeWidth={n ? 1.2 : 0}
                className="pl-cadeira"
                style={{ animationDelay: `${i * 12}ms` }}
              />
            );
          })}
          <text x="110" y="100" textAnchor="middle" className="pl-banc-total">{vagas}</text>
          <text x="110" y="112" textAnchor="middle" className="pl-banc-sub">
            {oficial ? "cadeiras (TSE)" : "cadeiras (estimativa)"}
          </text>
        </svg>
        <div className="pl-banc-qe">
          <span>Quociente eleitoral</span>
          <Num v={ap.quocienteEleitoral} />
          <em>{oficial ? "oficial TSE" : "válidos ÷ vagas, com a apuração parcial"}</em>
        </div>
      </div>
      <div className="pl-banc-lista">
        {ap.necessidade && (
          <div className="pl-nec-box">
            <div className="pl-nec-title">
              <span>NECESSIDADE DE VOTOS</span>
              <em className="tl-mono">
                {ap.necessidade.base === "oficial" ? "Oficial TSE" : ap.necessidade.base === "apuracao" ? `Com ${pctf(ap.pctUrnas, 1)}% apurado` : "Estimativa pré-apuração"}
              </em>
            </div>
            <div className="pl-nec-grid">
              <div>
                <b>QE {ap.necessidade.base === "oficial" ? "oficial" : "projetado"}</b>
                <span className="tl-mono">{nf(ap.necessidade.qeProjetado)}</span>
                <em>votos por cadeira</em>
              </div>
              <div>
                <b>Min. individual (10%)</b>
                <span className="tl-mono">{nf(ap.necessidade.minIndividual)}</span>
                <em>p/ candidato assumir</em>
              </div>
              <div>
                <b>Min. partido (80%)</b>
                <span className="tl-mono">{nf(ap.necessidade.minPartidoSobras)}</span>
                <em>p/ disputar sobras</em>
              </div>
              <div>
                <b>Corte do último eleito</b>
                <span className="tl-mono">{ap.necessidade.corte ? nf(ap.necessidade.corte) : "—"}</span>
                <em>{ap.necessidade.ultimoEleito ? `${ap.necessidade.ultimoEleito.partido} (${titulo(ap.necessidade.ultimoEleito.nome)})` : "votos nominais"}</em>
              </div>
            </div>
          </div>
        )}
        <div className="pl-banc-th">
          <span>Partido / federação</span>
          <span>Nominais + legenda</span>
          <span>% válidos</span>
          <span>Cadeiras</span>
          <span>+1 cadeira precisa de</span>
        </div>
        {partidos.slice(0, 14).map((x, i) => {
          const cor = corPartido(x.partidos[0] ?? x.sigla);
          const n = neon.get(x.sigla) ?? x.partidos.map((pp) => neon.get(pp)).find(Boolean);
          return (
            <div key={x.sigla} className="pl-banc-row" style={{ animationDelay: `${i * 60}ms` }}>
              <span className={`pl-banc-sigla ${n ? "pl-neon" : ""}`} style={n ? { color: n, ["--neon" as string]: n } : undefined}>
                <i style={{ background: cor }} />
                {x.sigla}
              </span>
              <span className="pl-banc-bar">
                <i style={{ width: `${(x.total / max) * 100}%`, background: cor }} />
                <em className="tl-mono">
                  {nf(x.nominais)} + {nf(x.legenda)}
                </em>
              </span>
              <span className="tl-mono">{pctf(x.pct)}%</span>
              <b className="tl-mono pl-banc-vagas">{x.vagas}</b>
              <span className="tl-mono pl-banc-falta">
                {x.faltaMais1 ? `+${nf(x.faltaMais1)}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── comparativo: projeção × pesquisa × boca de urna × realidade ── */
type Proj = { pct: number; err: number };

function projetar(ap: Apuracao): Map<string, Proj> {
  const out = new Map<string, Proj>();
  const u = ap.pctUrnas;
  const err = Math.max(0.3, 9 * Math.pow(1 - u / 100, 1.2)); // p.p., encolhe com as urnas
  for (const c of ap.cand.slice(0, 12)) {
    const serie = ap.historico
      .filter((h) => h.c[c.sq] !== undefined)
      .slice(-6)
      .map((h) => [h.urnas, h.c[c.sq]] as [number, number]);
    let proj = c.pct;
    if (serie.length >= 3) {
      // tendência: regressão linear dos últimos pontos, amortecida (50%) até 100%
      const n = serie.length;
      const mx = serie.reduce((a, [x]) => a + x, 0) / n;
      const my = serie.reduce((a, [, y]) => a + y, 0) / n;
      const den = serie.reduce((a, [x]) => a + (x - mx) ** 2, 0);
      const slope = den > 0 ? serie.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / den : 0;
      proj = c.pct + slope * (100 - u) * 0.5;
    }
    out.set(c.num, { pct: Math.max(0, Math.min(100, proj)), err });
  }
  return out;
}

type Veredito = { texto: string; definido: boolean; conf: "alta" | "média" | "baixa" };

function veredito(_lista: { nome: string; pct: number; err: number }[], _vagas: number, _majoritario1t: boolean): Veredito {
  return { texto: "Resultado e segundo turno dependem da totalização oficial", definido: false, conf: "baixa" };
}

function Comparativo({
  p,
  ap,
  pesquisa,
  boca,
  fotoBase,
}: {
  p: PleitoSnapshot;
  ap?: Apuracao;
  pesquisa?: BocaPesquisa;
  boca?: BocaPesquisa;
  fotoBase: string;
}) {
  const real = ap && ap.status !== "aguardando" ? ap : undefined;
  const proj = new Map<string, Proj>();
  // candidatos: união (ordem = realidade > boca > pesquisa)
  const ordem: { num: string; nome: string; partido: string; sq: string }[] = [];
  const add = (num: string, nome: string, partido: string, sq = "") => {
    if (!ordem.some((o) => o.num === num)) ordem.push({ num, nome, partido, sq });
  };
  real?.cand.slice(0, 7).forEach((c) => add(c.num, c.nome, c.partido, c.sq));
  boca?.cand.forEach((c) => add(String(c.num), c.nome, c.partido));
  pesquisa?.cand.forEach((c) => add(String(c.num), c.nome, c.partido));
  const linhas = ordem.slice(0, 7).map((o) => {
    const snap = p.candidatos.find((c) => String(c.num) === o.num);
    const sq = o.sq || snap?.foto.match(/\/(\d{9,})\/[A-Z]{2}$/)?.[1] || "";
    return {
      ...o,
      sq,
      pesq: pesquisa?.cand.find((c) => String(c.num) === o.num)?.pct,
      boca: boca?.cand.find((c) => String(c.num) === o.num)?.pct,
      real: real?.cand.find((c) => c.num === o.num)?.pct,
      proj: proj.get(o.num),
    };
  });
  const max = Math.max(10, ...linhas.flatMap((l) => [l.pesq ?? 0, l.boca ?? 0, l.real ?? 0, (l.proj?.pct ?? 0) + (l.proj?.err ?? 0)]));

  // veredito com a melhor informação disponível: projeção > boca > pesquisa
  const base = real
    ? linhas.filter((l) => l.proj).map((l) => ({ nome: l.nome, pct: l.proj!.pct, err: l.proj!.err })).sort((a, b) => b.pct - a.pct)
    : (boca ?? pesquisa)?.cand.map((c) => ({ nome: c.nome, pct: c.pct, err: (boca ?? pesquisa)!.margem || 2 })) ?? [];
  const ver = veredito(base, p.vagas, p.id !== "senador-sp");
  const fonteVer = real ? `projeção com ${pctf(real.pctUrnas, 1)}% das urnas` : boca ? "boca de urna" : pesquisa ? "última pesquisa" : "";

  // antecedência: primeiro ponto do histórico em que o veredito já estava definido
  let definidoEm = "";
  if (real) {
    for (const h of real.historico) {
      const errH = Math.max(0.3, 9 * Math.pow(1 - h.urnas / 100, 1.2));
      const l = real.cand
        .filter((c) => h.c[c.sq] !== undefined)
        .map((c) => ({ nome: c.nome, pct: h.c[c.sq], err: errH }))
        .sort((a, b) => b.pct - a.pct);
      const v = veredito(l, p.vagas, p.id !== "senador-sp");
      if (v.definido && v.texto === ver.texto) {
        definidoEm = `definido com ${pctf(h.urnas, 1)}% das urnas (${h.hora.split(" ")[1] ?? h.hora})`;
        break;
      }
    }
  }

  const series = [
    { k: "pesq", lbl: "Pesquisa", cls: "s-pesq", info: pesquisa ? `${pesquisa.instituto} ${pesquisa.divulgadoEm}` : "não lançada" },
    { k: "boca", lbl: "Boca de urna", cls: "s-boca", info: boca ? `${boca.instituto} ${boca.divulgadoEm}` : "não lançada" },
    { k: "proj", lbl: "Projeção", cls: "s-proj", info: "indisponível · modelo não validado" },
    { k: "real", lbl: "Realidade (TSE)", cls: "s-real", info: real ? `${pctf(real.pctUrnas, 1)}% urnas` : "aguardando" },
  ] as const;

  return (
    <div className="pl-comp">
      <div className={`pl-comp-ver ${ver.definido ? "ok" : ""}`}>
        <span className="pl-boca-tag pl-comp-tag">ACOMPANHAMENTO OFICIAL</span>
        <div className="pl-comp-txt">{ver.texto}</div>
        <div className="pl-comp-meta">
          <span className={`pl-conf pl-conf-${ver.conf === "média" ? "media" : ver.conf}`}>Sem modelo de probabilidade validado</span>
          {fonteVer && <span>base: {fonteVer}</span>}
          {definidoEm && <span className="pl-comp-def">✓ {definidoEm}</span>}
        </div>
        <div className="pl-comp-leg">
          {series.map((s) => (
            <div key={s.k}>
              <i className={s.cls} />
              <b>{s.lbl}</b>
              <em>{s.info}</em>
            </div>
          ))}
        </div>
      </div>
      <div className="pl-comp-grid">
        {linhas.map((l, i) => {
          const cor = corPartido(l.partido);
          return (
            <div key={l.num} className="pl-comp-row" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="pl-comp-cand">
                <Foto src={l.sq ? `${fotoBase}/${l.sq}` : ""} nome={l.nome} cor={cor} size="2.8em" />
                <div>
                  <Nome partido={l.partido} className="pl-row-nome">{titulo(l.nome)}</Nome>
                  <span className="pl-row-part" style={{ color: cor }}>{l.partido} · {l.num}</span>
                </div>
              </div>
              <div className="pl-comp-bars">
                {series.map((s) => {
                  const v = s.k === "proj" ? l.proj?.pct : l[s.k];
                  return (
                    <div key={s.k} className="pl-comp-bar">
                      <span className="pl-comp-track">
                        {v !== undefined && <i className={s.cls} style={{ width: `${(v / max) * 100}%` }} />}
                        {s.k === "proj" && l.proj && (
                          <u
                            style={{
                              left: `${(Math.max(0, l.proj.pct - l.proj.err) / max) * 100}%`,
                              width: `${((2 * l.proj.err) / max) * 100}%`,
                            }}
                          />
                        )}
                      </span>
                      <em className="tl-mono">{v !== undefined ? `${pctf(v, 1)}%` : "—"}</em>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {linhas.length === 0 && (
          <div className="pl-boca-vazio">
            <p>Lance a última pesquisa e a boca de urna em /telao/boca-de-urna.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── notícias: título + resumo + veículo + hora com link externo em nova aba ── */
function NoticiasScene({ lista, offset }: { lista: Noticia[]; offset: number }) {
  if (!lista.length) {
    return (
      <div className="pl-boca-vazio">
        <div className="pl-boca-tag pl-evo-tag">NOTÍCIAS</div>
        <p>Carregando manchetes dos principais veículos…</p>
      </div>
    );
  }
  const n = 6;
  const ini = (offset * n) % lista.length;
  const sel = [...lista.slice(ini), ...lista.slice(0, ini)].slice(0, n);
  return (
    <div className="pl-news">
      {sel.map((x, i) => (
        <a
          key={`${x.veiculo}-${x.titulo}`}
          href={x.link || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`pl-news-card ${i === 0 ? "pl-news-main" : ""}`}
          style={{ animationDelay: `${i * 90}ms` }}
        >
          <header>
            <b style={{ background: x.cor }}>{x.nome}</b>
            <span className="tl-mono">
              {x.t ? new Date(x.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : ""}
            </span>
          </header>
          <h3>{x.titulo}</h3>
          {x.resumo && <p>{x.resumo}</p>}
          <span className="pl-news-link">Abrir matéria na íntegra ↗</span>
        </a>
      ))}
    </div>
  );
}

/* ── painel nacional: apuração nas 27 UFs ── */
function PainelBrasil({ panorama }: { panorama: Panorama | null }) {
  if (!panorama) {
    return (
      <div className="pl-boca-vazio">
        <div className="pl-boca-tag pl-evo-tag">PANORAMA NACIONAL</div>
        <p>Carregando apuração das 27 unidades da federação (TSE)…</p>
      </div>
    );
  }
  return (
    <div className="pl-br-panel">
      <div className="pl-br-head">
        <div>
          <h2>BRASIL · APURAÇÃO AO VIVO EM TODAS AS 27 UFS</h2>
          <em>{pctf(panorama.pctUrnasMedia, 1)}% de seções nas UFs com denominador conhecido ({panorama.territorios?.filter(x => x.pleito === "presidente" && x.secoesTotal > 0).length ?? 0}/27) · atualizado {new Date(panorama.geradoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</em>
        </div>
      </div>
      <div className="pl-br-grid">
        <div className="pl-br-card">
          <h3>CÂMARA DOS DEPUTADOS ({panorama.camara.vagas} CADEIRAS)</h3>
          <div className="pl-br-bancadas">
            {panorama.camara.partidos.slice(0, 10).map((p) => (
              <div key={p.partido} className="pl-br-banc-item">
                <b style={{ color: corPartido(p.partido) }}>{p.partido}</b>
                <span className="tl-mono">{p.vagas} vagas</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pl-br-card">
          <h3>SENADO FEDERAL ({panorama.casaSenado.vagas} VAGAS EM DISPUTA)</h3>
          <div className="pl-br-bancadas">
            {panorama.casaSenado.partidos.slice(0, 8).map((p) => (
              <div key={p.partido} className="pl-br-banc-item">
                <b style={{ color: corPartido(p.partido) }}>{p.partido}</b>
                <span className="tl-mono">{p.vagas} eleitos/líd.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="pl-br-govs">
        <h3>GOVERNADORES NAS 27 UFS</h3>
        <div className="pl-br-gov-grid">
          {panorama.governadores.map((g) => {
            const l = g.cand[0];
            const cor = l ? corPartido(l.partido) : "#666";
            return (
              <div key={g.uf} className="pl-br-gov-item">
                <span className="pl-br-uf tl-mono">{g.uf.toUpperCase()}</span>
                {l ? (
                  <div className="pl-br-gov-cand">
                    <span className="pl-br-cand-nome">{titulo(l.nome)}</span>
                    <span className="pl-br-cand-part" style={{ color: cor }}>{l.partido}</span>
                    <span className="tl-mono">{pctf(l.pct, 1)}%</span>
                  </div>
                ) : (
                  <span>aguardando</span>
                )}
                <em className="tl-mono">{pctf(g.pctUrnas, 0)}%</em>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Modo = "ambos" | "apuracao" | "boca" | "noticias";
type Cena = {
  pi: number;
  tipo: "apuracao" | "corrida" | "evolucao" | "bancadas" | "comparativo" | "boca" | "noticias" | "panorama";
};

/* ── wall ── */
/* fundo: "skyline" de barras 3D em degradê (decorativo, alturas determinísticas) */


const CENA_NOME: Record<Cena["tipo"], string> = {
  apuracao: "Apuração",
  corrida: "Corrida",
  evolucao: "Evolução",
  bancadas: "Bancadas",
  comparativo: "Comparativo",
  boca: "Boca de urna",
  noticias: "Notícias",
  panorama: "Panorama",
};


export function PleitosWall({ pleitos: pleitosProps, fotoBase, meta, variant = "tv" }: Props) {
  const mobile = variant === "mobile";
  const now = useNow(1000);
  const [uf, setUf] = useState("sp");
  const [escopo, setEscopo] = useState<Escopo>({});
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [pleitosUF, setPleitosUF] = useState<PleitoSnapshot[]>(pleitosProps);
  const ap = useApuracao(escopo, uf);
  const panorama = usePanorama();
  const boca = useBoca("boca", uf);
  const pesquisas = useBoca("pesquisa", uf);
  const noticias = useNoticias();

  const [modo, setModo] = useState<Modo>("ambos");
  const [destaque, setDestaque] = useState<string[]>([]);
  const [escolhendo, setEscolhendo] = useState(false);
  const [ativando, setAtivando] = useState(false);
  const [authStatus, setAuthStatus] = useState<"checking" | "guest" | "authenticated">("checking");
  const [mapaAberto, setMapaAberto] = useState(false);
  const regionDialogRef = useRef<HTMLElement>(null);
  const [precisaAtivar, setPrecisaAtivar] = useState(false);

  useEffect(() => {
    // telão: login do cockpit OU registro simples (nome + WhatsApp)
    fetch("/api/telao/registro", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { cockpit?: boolean }) => {
        setAuthStatus("authenticated");
        if (!d.cockpit) return;
        // ativação diária só para quem tem login do cockpit
        fetch("/api/candidato/perfil")
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data && !data.ativadoHoje) setPrecisaAtivar(true);
          })
          .catch(() => {});
      })
      .catch(() => setAuthStatus("guest"));
  }, []);

  // carregar pré-apuração da UF quando o usuário trocar para estado diferente de SP
  useEffect(() => {
    if (uf === "sp") return;
    let cancelled = false;
    const empty = pleitosProps.map(pl => pl.id === "presidente" ? pl : { ...pl, uf: uf.toUpperCase(), candidatos: [], total: 0, statusFonte: "erro" as const });
    setPleitosUF(empty);
    fetch(`/api/telao/candidatos?uf=${uf}`)
        .then((r) => (r.ok ? r.json() : empty))
        .then((d) => { if (!cancelled) setPleitosUF(d); })
        .catch(() => { if (!cancelled) setPleitosUF(empty); });
    return () => { cancelled = true; };
  }, [uf, pleitosProps]);

  // carregar lista oficial de municípios do TSE para a UF ativa
  useEffect(() => {
    if (!uf) return;
    let cancelled = false;
    fetch(`/api/telao/municipios?uf=${uf.toLowerCase()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setMunicipios(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uf]);

  const pleitos = uf === "sp" ? pleitosProps : pleitosUF;

  // partidos presentes nos pleitos (para o seletor), ordenados por nº de candidatos
  const partidos = useMemo(() => {
    const cont = new Map<string, number>();
    for (const pl of pleitos) for (const c of pl.candidatos) cont.set(c.p, (cont.get(c.p) ?? 0) + 1);
    for (const p of Object.keys(COR_PARTIDO)) if (!cont.has(p)) cont.set(p, 0);
    return [...cont.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p]) => p);
  }, [pleitos]);
  const neonMap = useMemo(
    () => new Map(destaque.map((p) => [p, COR_PARTIDO[p] ?? "#facc15"])),
    [destaque],
  );
  // número da legenda (2 primeiros dígitos do número de qualquer candidato do partido)
  const numeros = useMemo(() => {
    const m = new Map<string, string>();
    for (const pl of pleitos) for (const c of pl.candidatos) if (!m.has(c.p) && c.num >= 10) m.set(c.p, String(c.num).slice(0, 2));
    return m;
  }, [pleitos]);
  const [mostrarMiniMapa, setMostrarMiniMapa] = useState(false);

  // tema: claro "wood" (padrão) ou escuro — persiste por aparelho
  const [tema, setTema] = useState<"wood" | "escuro">(() => {
    if (typeof window === "undefined") return "wood";
    try {
      return localStorage.getItem("telao-tema") === "escuro" ? "escuro" : "wood";
    } catch {
      return "wood";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try {
      localStorage.setItem("telao-tema", tema);
    } catch {
      /* ignora */
    }
  }, [tema]);

  // zoom do candidato
  const [zoom, setZoom] = useState<ZoomAberto | null>(null);
  const abrirZoom = useCallback((alvo: ZoomAlvo, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setZoom({ ...alvo, rect: { x: r.left, y: r.top, w: r.width, h: r.height } });
  }, []);
  const fecharZoom = useCallback(() => setZoom(null), []);

  // destaque inicial: ?destaque=PL,NOVO > último salvo > abre o seletor no início
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("destaque");
    let sel: string[] | null = q ? q.split(",").map((s) => s.trim()).filter(Boolean) : null;
    if (!sel) {
      try {
        const raw = localStorage.getItem("telao-pleitos-destaque");
        if (raw) sel = JSON.parse(raw) as string[];
      } catch {
        /* ignora */
      }
    }
    const t = setTimeout(() => {
      if (sel) setDestaque(sel);
      else setEscolhendo(true);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const fecharSeletor = () => {
    setEscolhendo(false);
    try {
      localStorage.setItem("telao-pleitos-destaque", JSON.stringify(destaque));
    } catch {
      /* ignora */
    }
  };

  // query params de controle
  const [fixo, setFixo] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState(15_000);
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    const timer = setTimeout(() => {
    setFixo(usp.get("p"));
    const i = parseInt(usp.get("int") || "", 10);
    if (i && i >= 5) setIntervalo(i * 1000);
    const m = usp.get("m");
    if (m === "boca" || m === "noticias") setModo(m);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const nCenas = modo === "boca" ? 2 : modo === "noticias" ? 1 : 4;
  const numCenasFixas = (pleitoId: PleitoId): number => {
    if (modo === "boca") return temBoca(pleitoId, boca) ? 2 : 0;
    if (modo === "noticias") return 1;
    return isProporcional(pleitoId) ? 2 : 4;
  };

  const cenas = useMemo(() => {
    const out: { pi: number; j: number; tipo: Cena["tipo"] }[] = [];
    if (fixo === "brasil") {
      out.push({ pi: -1, j: 0, tipo: "panorama" });
      if (modo === "boca") out.push({ pi: -1, j: 1, tipo: "boca" });
      if (modo === "ambos" || modo === "noticias") out.push({ pi: -1, j: out.length, tipo: "noticias" });
      return out;
    }
    pleitos.forEach((pl, pi) => {
      if (fixo && pl.id !== fixo) return;
      if (modo === "boca") {
        if (temBoca(pl.id, boca)) {
          out.push({ pi, j: 0, tipo: "boca" });
          out.push({ pi, j: 1, tipo: "boca" });
        }
      } else if (modo === "noticias") {
        out.push({ pi, j: 0, tipo: "noticias" });
      } else {
        out.push({ pi, j: 0, tipo: "apuracao" });
        const resLocal = ap[pl.id];
        const temResultadoLocal = !!resLocal && resLocal.cand.length > 0 && resLocal.status !== "aguardando";
        if (temResultadoLocal) {
          out.push({ pi, j: 1, tipo: "corrida" });
          if (!isProporcional(pl.id)) {
            out.push({ pi, j: 2, tipo: "evolucao" });
            out.push({ pi, j: 3, tipo: "bancadas" });
          }
        }
      }
    });
    return out;
  }, [pleitos, fixo, modo, boca, ap]);

  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Navegação de scroll por teclado (Cima e Baixo)
  useEffect(() => {
    const handleScrollKey = (e: KeyboardEvent) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const container = document.querySelector(".pl-vit-grid, .pl-stage") as HTMLElement | null;
      if (!container) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        container.scrollBy({ top: 240, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        container.scrollBy({ top: -240, behavior: "smooth" });
      } else if (e.key === "PageDown") {
        e.preventDefault();
        container.scrollBy({ top: 600, behavior: "smooth" });
      } else if (e.key === "PageUp") {
        e.preventDefault();
        container.scrollBy({ top: -600, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleScrollKey);
    return () => window.removeEventListener("keydown", handleScrollKey);
  }, []);

  // timer do carrossel (só roda se não houver um pleito fixo, ou se o fixo
  // tiver múltiplas cenas)
  useEffect(() => {
    if (mobile || mapaAberto || escolhendo || ativando || zoom || !cenas.length) return;
    if (fixo && cenas.length <= 1) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + 50;
        if (next >= intervalo) {
          setIdx((i) => (i + 1) % cenas.length);
          return 0;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(t);
  }, [intervalo, cenas.length, fixo, mobile, mapaAberto, escolhendo, ativando, zoom]);

  const cena = cenas[idx] || { pi: 0, j: 0, tipo: "apuracao" };
  const p = pleitos[cena.pi] || pleitos[0];
  const a = ap[p.id];
  const pesq = pesquisas[p.id as keyof typeof pesquisas];
  const ehBoca = cena.tipo === "boca";
  const cenasDoPleito = cenas.map((c, j) => ({ ...c, j })).filter((c) => c.pi === cena.pi);
  const temResultado = !!a && a.cand.length > 0 && a.status !== "aguardando";
  const hora = now ? new Date(now).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "--:--:--";

  const ticker = useMemo(
    () =>
      pleitos.map((pl) => {
        const r = ap[pl.id];
        if (!r || r.pctUrnas === 0) return `${pl.titulo}: aguardando urnas...`;
        return `${pl.titulo}: ${r.cand.slice(0, 3).map((c) => `${c.nome} ${c.pct}%`).join(" · ")} (${pctf(r.pctUrnas, 1)}% apurado)`;
      }),
    [ap, pleitos],
  );

  const localTxt = p.id.startsWith("presidente")
    ? (escopo.mu && municipios.find((m) => m.cd === escopo.mu)?.nm) || (escopo.uf && UF_NOME[escopo.uf as keyof typeof UF_NOME])
    : escopo.mu && municipios.find((m) => m.cd === escopo.mu)?.nm;

  const statusTxt = ehBoca
    ? "PESQUISA DE BOCA DE URNA"
    : cena.tipo === "corrida"
      ? "CORRIDA · PASSO A PASSO"
      : cena.tipo === "evolucao"
        ? "EVOLUÇÃO DA APURAÇÃO"
        : cena.tipo === "bancadas"
          ? "BANCADAS · CADEIRAS POR PARTIDO"
          : cena.tipo === "comparativo"
            ? "PROJEÇÃO × PESQUISA × BOCA DE URNA × REALIDADE"
            : a?.status === "finalizado"
              ? "APURAÇÃO ENCERRADA"
              : temResultado
                ? "APURAÇÃO AO VIVO"
                : "PRÉ-APURAÇÃO";

  useEffect(() => {
    if (!mapaAberto || authStatus !== "authenticated") return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = regionDialogRef.current;
    dialog?.querySelector<HTMLSelectElement>("select")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMapaAberto(false);
        if (precisaAtivar) setAtivando(true);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, select, [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus();
      else document.querySelector<HTMLButtonElement>(".pl-tabs button[aria-current='page']")?.focus();
    };
  }, [mapaAberto, authStatus, precisaAtivar]);

  if (authStatus === "checking") return null;
  if (authStatus === "guest")
    return (
      <RegistroTelao
        partidos={partidos}
        numeros={numeros}
        onDone={(sel) => {
          setDestaque(sel);
          setEscolhendo(false);
          try {
            localStorage.setItem("telao-pleitos-destaque", JSON.stringify(sel));
          } catch {
            /* ignora */
          }
          setAuthStatus("authenticated");
        }}
      />
    );

  const mudarEscopo = (novo: Escopo) => {
    setEscopo(novo);
    setElapsed(0);
  };

  return (
    <NeonCtx.Provider value={neonMap}>
    <ZoomCtx.Provider value={abrirZoom}>
    <main
      className={`telao pl-wall ${mobile ? "pl-mobile" : ""} ${a ? "pl-status-apurando" : ""}`}
      data-tema={tema}
      style={mobile ? undefined : ({ "--pl-h": "100vh" } as React.CSSProperties)}
    >
      <div className="pl-wood" aria-hidden>
        <div className="pl-wood-veio" />
        <div className="pl-wood-piso">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
      </div>


      <header className="pl-head">
        <div className="pl-brand">
          <span className={`pl-live ${temResultado && a?.status !== "finalizado" ? "on" : ""}`} />
          <div>
            <div className="pl-kicker">ELEIÇÕES 2026 · 1º TURNO · {statusTxt}</div>
            <h1 key={`${p.id}-${cena.tipo}`} className="pl-title">
              {p.titulo}
              {localTxt && <span className="pl-title-local">{localTxt}</span>}
            </h1>
          </div>
        </div>
        <nav className="pl-tabs" aria-label="Cargo eleitoral">
          {pleitos.map((pl, i) => (
            <button
              key={pl.id}
              className={i === cena.pi ? "on" : ""}
              aria-current={i === cena.pi ? "page" : undefined}
              onClick={() => {
                const j = cenas.findIndex((c) => c.pi === i);
                if (j >= 0) setIdx(j);
                setElapsed(0);
              }}
            >
              <span>{pl.titulo.replace(" · SP", "")}</span>
              {temBoca(pl.id, boca) && <b className="pl-tab-boca">BU</b>}
              <i style={{ width: i === cena.pi ? (fixo ? "100%" : `${(elapsed / intervalo) * 100}%`) : 0 }} />
              {ap[pl.id]?.pctUrnas ? <em className="tl-mono">{pctf(ap[pl.id]!.pctUrnas, 1)}%</em> : null}
            </button>
          ))}
        </nav>
        <nav className="pl-cenas" aria-label="Visualização de resultados">
          {cenasDoPleito.map((c) => (
            <button
              key={c.tipo}
              className={c.j === idx % nCenas ? "on" : ""}
              onClick={() => {
                setIdx(c.j);
                setElapsed(0);
              }}
            >
              {CENA_NOME[c.tipo]}
            </button>
          ))}
        </nav>
        <div className="pl-modos">
          {(["ambos", "apuracao", "boca"] as Modo[]).map((m) => (
            <button
              key={m}
              className={modo === m ? "on" : ""}
              onClick={() => {
                setModo(m);
                setIdx(0);
                setElapsed(0);
              }}
            >
              {m === "ambos" ? "Tudo" : m === "apuracao" ? "Apuração" : "Boca de urna"}
            </button>
          ))}
        </div>
        <button
          className="pl-filtro-btn pl-dest-btn"
          onClick={() => setAtivando(true)}
          title="Ativação diária do perfil do candidato e push de resultados"
        >
          <UserRound size={16} aria-hidden /> Candidato
        </button>
        <div className="pl-partido-quick-select" title="Escolha rápida de partido para destacar candidatos">
          <i style={{ width: 10, height: 10, borderRadius: "50%", background: destaque[0] ? (COR_PARTIDO[destaque[0]] ?? "#fff") : "#64748b", display: "inline-block" }} />
          <select
            className="pl-partido-select-native"
            value={destaque[0] ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              const novo = val ? [val] : [];
              setDestaque(novo);
              try {
                localStorage.setItem("telao-pleitos-destaque", JSON.stringify(novo));
              } catch {}
            }}
          >
            <option value="">Partido (todos)</option>
            {partidos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`pl-filtro-btn pl-dest-btn ${mostrarMiniMapa ? "on" : ""}`}
          onClick={() => setMostrarMiniMapa((v) => !v)}
          title="Ver mapa de andamento do pleito por estado e cargo"
        >
          <Flag size={16} aria-hidden /> Andamento
        </button>
        <button
          className={`pl-filtro-btn pl-dest-btn ${destaque.length ? "on" : ""}`}
          onClick={() => setEscolhendo(true)}
          title="Escolher partidos em destaque"
        >
          <Star size={16} aria-hidden /> {destaque.length ? destaque.join(" · ") : "Destaque"}
        </button>
        <button
          type="button"
          className="pl-filtro-btn pl-tema-btn"
          onClick={() => setTema((t) => (t === "wood" ? "escuro" : "wood"))}
          aria-label={tema === "wood" ? "Mudar para o tema escuro" : "Mudar para o tema claro"}
          title={tema === "wood" ? "Tema escuro" : "Tema claro"}
        >
          {tema === "wood" ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
        </button>
        <SeletorUF uf={uf} onClick={() => setMapaAberto(true)} />
        <FiltroLocal escopo={escopo} onChange={mudarEscopo} municipios={municipios} uf={uf} />
        <Contagem now={now} />
        <div className="pl-clock tl-mono">{hora}</div>
        <CampaignMonitor partyColor={corPartido} p={p} ap={a ?? undefined} pesquisa={pesq as BocaPesquisa | undefined} panorama={panorama} noticias={noticias} uf={uf} now={now} onSelectUf={(u)=>{setUf(u);setEscopo({});}} />
      </header>

      {mostrarMiniMapa && (
        <div className="mini-mapa-container">
          <MiniMapaPleito
            ufSel={uf}
            onSelectUf={(u) => {
              setUf(u);
              setEscopo({});
            }}
            onClose={() => setMostrarMiniMapa(false)}
          />
        </div>
      )}

      <div className="pl-body" key={`${p.id}-${cena.tipo}`}>
        <Andamento ap={a} now={now} />
        <section className="pl-stage">
          {cena.tipo === "noticias" ? (
            <NoticiasScene lista={noticias} offset={cena.pi} />
          ) : cena.tipo === "corrida" ? (
            <Corrida p={p} ap={a} fotoBase={fotoBase[p.id]} rastro={rastroDe(a)} />
          ) : cena.tipo === "evolucao" ? (
            <Evolucao p={p} ap={a} />
          ) : cena.tipo === "bancadas" ? (
            <Bancadas p={p} ap={a} />
          ) : cena.tipo === "comparativo" ? (
            <Comparativo
              p={p}
              ap={escopo.mu ? undefined : a}
              pesquisa={pesquisas[p.id as keyof BocaDeUrna] as BocaPesquisa | undefined}
              boca={boca[p.id as keyof BocaDeUrna] as BocaPesquisa | undefined}
              fotoBase={fotoBase[p.id]}
            />
          ) : ehBoca ? (
            <BocaScene
              pesquisa={boca[p.id as keyof BocaDeUrna] as BocaPesquisa | undefined}
              p={p}
              ap={escopo.mu ? undefined : a}
              fotoBase={fotoBase[p.id]}
            />
          ) : temResultado ? (
            isProporcional(p.id) ? (
              <Proporcional ap={a!} vagas={p.vagas} />
            ) : (
              <Majoritario ap={a!} vagas={p.vagas} />
            )
          ) : (
            <Vitrine
              p={p}
              fotoBase={fotoBase[p.id]}
              now={now}
              pesquisa={pesquisas[p.id as keyof BocaDeUrna] as BocaPesquisa | undefined}
            />
          )}
        </section>
      </div>

      <MobileNewsTicker news={noticias}/>
      <footer className="pl-foot">
        <div className="pl-ticker">
          <div
            className="pl-ticker-track"
            style={{ animationDuration: `${Math.max(60, (noticias.length + ticker.length) * 7)}s` }}
          >
            {[0, 1].map((rep) => (
              <span key={rep} className="pl-ticker-loop">
                {ticker.map((t, i) => (
                  <span key={`r${i}`} className="pl-tk-res">◆ {t}</span>
                ))}
                {noticias.map((n, i) => (
                  <span key={`n${i}`} className="pl-tk-news">
                    <b style={{ background: n.cor }}>{n.nome}</b>
                    {n.titulo}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        <div className="pl-src">
          <b className="pl-src-alerta">USO ESTRITAMENTE INTERNO PARTIDÁRIO</b> · Não aberto ao público · Dados oficiais: TSE resultados.tse.jus.br (atualiza a cada 1 min) · Mídias sintéticas rotuladas conforme Resoluções TSE nº 23.610/2019 e 23.755/2026 · notícias via Google News{ehBoca ? " · boca de urna: instituto indicado" : ""} · candidatos {meta.fonte} ({meta.atualizado}) · ← → troca · espaço fixa
        </div>
      </footer>
      <a className="pl-assina" href="https://angra.io" target="_blank" rel="noreferrer">
        by TITAN PESQUISAS e ANGRA.IO
      </a>
      {escolhendo && !mapaAberto && !ativando && (
        <SeletorDestaque partidos={partidos} numeros={numeros} sel={destaque} onChange={setDestaque} onClose={fecharSeletor} />
      )}
      {mapaAberto && (
        <div className="pl-region-overlay" role="dialog" aria-modal="true" aria-labelledby="region-title">
          <section className="pl-region-dialog" ref={regionDialogRef}>
            <div className="pl-region-photo">
              <AmbientVideo />
              <div><Radio size={28} /><h2>O Brasil decide.<br />Você acompanha.</h2><p>Presidente, governadores e casas legislativas em uma central de apuração.</p><small>Imagem ilustrativa gerada por IA</small></div>
            </div>
            <div className="pl-region-content">
              <button type="button" className="pl-region-close" aria-label="Continuar com o estado atual" onClick={() => { setMapaAberto(false); if (precisaAtivar) setAtivando(true); }}><X size={22} /></button>
              <h2 id="region-title">Sua eleição,<br /><span>mais perto.</span></h2>
              <p>Escolha o estado para acompanhar candidatos e resultados. Você pode trocar a região a qualquer momento.</p>
              <div className="pl-region-map"><BrazilMap uf={uf} onSelect={(u) => { setUf(u); }} /></div>
              <label htmlFor="region-select"><MapPin size={16} /> Estado que deseja acompanhar</label>
              <select id="region-select" value={uf} onChange={(event) => setUf(event.target.value)}>{[...UFS].sort((a,b) => UF_NOME[a].localeCompare(UF_NOME[b], "pt-BR")).map((u) => <option key={u} value={u}>{UF_NOME[u]}</option>)}</select>
              <button type="button" className="pl-region-continue" onClick={() => { setEscopo({}); setMapaAberto(false); if (precisaAtivar) setAtivando(true); }}>Acompanhar {UF_NOME[uf]} <ArrowRight size={18} /></button>
              <small>Dados e horários sujeitos à atualização das fontes. Consulte os canais oficiais do TSE.</small>
            </div>
          </section>
        </div>
      )}
      {ativando && (
        <AtivacaoCandidatoModal initialUf={uf} required={precisaAtivar} onSaved={() => { setPrecisaAtivar(false); setAtivando(false); }} onClose={() => setAtivando(false)} />
      )}
      {zoom && <CandidatoZoom key={`${zoom.partido}-${zoom.num}`} alvo={zoom} onClose={fecharZoom} mobile={mobile} />}
    </main>
    </ZoomCtx.Provider>
    </NeonCtx.Provider>
  );
}
