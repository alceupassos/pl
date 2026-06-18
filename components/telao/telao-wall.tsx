"use client";

// Telão "Sala de Guerra" — centro de controle ao vivo da campanha.
// Consome o SSE /api/stream (canais equipe/voz/pesquisas/ticker) via o provider
// do /m. Configurável (escala da TV, holofote rotativo, som, mapa) por painel,
// querystring (?escala=4k&rotacao=1&som=1&int=18&mapa=1) e localStorage.

import { useEffect, useRef, useState } from "react";

import { useLiveChannel, useLiveStatus } from "@/components/mobile/live/use-live";
import { Odometer } from "@/components/mobile/ui/odometer";
import type {
  EquipeSnapshot,
  PesquisasSnapshot,
  TapeSnapshot,
  VozSnapshot,
} from "@/lib/live-schemas";

const ALTA = "#16c784";
const BAIXA = "#ea3943";
const AMBAR = "#f5a623";

const SCENES = ["pulso", "operadores", "territorio", "comunicacao", "pesquisa"] as const;
type Scene = (typeof SCENES)[number];
const MILESTONES = [25, 50, 75, 90, 100];

/* posição esquemática das 8 regiões do RJ (viewBox 100×62) */
const RJ_POS: Record<string, [number, number, number, number]> = {
  "noroeste-fluminense": [2, 2, 29, 16],
  "norte-fluminense": [63, 2, 35, 18],
  serrana: [33, 7, 28, 17],
  "medio-paraiba": [2, 22, 25, 18],
  "centro-sul": [29, 27, 25, 13],
  "baixadas-litoraneas": [62, 24, 36, 18],
  metropolitana: [29, 43, 39, 17],
  "costa-verde": [2, 44, 25, 16],
};

function corNivel(n: string): string {
  const s = n.toLowerCase();
  if (s.includes("igreja") || s.includes("church") || s.includes("líder") || s.includes("lider"))
    return "#a78bfa";
  if (s.includes("gerente") || s.includes("regional")) return "#4c82f0";
  if (s.includes("deput") || s.includes("state")) return "#f5a623";
  return "#16c784";
}
function corPct(p: number): string {
  return p >= 80 ? ALTA : p >= 50 ? AMBAR : BAIXA;
}
function corTom(t: string): string {
  return t === "pos" ? ALTA : t === "neg" ? BAIXA : "#8893a8";
}
function nf(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

/* ── config ── */
type Escala = "auto" | "1080" | "1440" | "4k";
type Cfg = { escala: Escala; rotacao: boolean; intervalo: number; som: boolean; mapa: boolean };
const DEFAULT_CFG: Cfg = { escala: "auto", rotacao: true, intervalo: 18, som: false, mapa: true };

function loadCfg(): Cfg {
  if (typeof window === "undefined") return DEFAULT_CFG;
  let cfg = { ...DEFAULT_CFG };
  try {
    const raw = localStorage.getItem("telao-cfg");
    if (raw) cfg = { ...cfg, ...JSON.parse(raw) };
  } catch {
    /* ignora */
  }
  const q = new URLSearchParams(window.location.search);
  if (q.get("escala")) cfg.escala = q.get("escala") as Escala;
  if (q.get("rotacao")) cfg.rotacao = q.get("rotacao") !== "0";
  if (q.get("som")) cfg.som = q.get("som") === "1";
  if (q.get("mapa")) cfg.mapa = q.get("mapa") !== "0";
  if (q.get("int")) cfg.intervalo = Math.max(6, Number(q.get("int")) || 18);
  return cfg;
}

/* ── relógio 1s ── */
function useClock(): string {
  const [s, setS] = useState("--:--:--");
  useEffect(() => {
    const fmt = () =>
      setS(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return s;
}

/* ── som (Web Audio, sem assets) ── */
function beep(ctx: AudioContext, freq: number, dur: number, gain = 0.07, delay = 0) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime + delay;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur);
}

function Spark({ data, cor }: { data: number[]; cor: string }) {
  if (!data || data.length < 2) return <svg className="tl-spark" />;
  const w = 54;
  const h = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - ((v - min) / span) * (h - 2) - 1).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="tl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function buildEcg(): string {
  const cell = 250;
  const beat = [
    [0, 50], [92, 50], [104, 44], [116, 50], [128, 50],
    [150, 62], [160, 12], [170, 66], [182, 50],
    [210, 44], [222, 50], [250, 50],
  ];
  const out: string[] = [];
  for (let c = 0; c < 8; c++) for (const [x, y] of beat) out.push(`${(c * cell + x).toFixed(0)},${y}`);
  return out.join(" ");
}
const ECG_PTS = buildEcg();

function Ecg() {
  return (
    <div className="tl-ecgwrap">
      <svg className="tl-ecg" viewBox="0 0 2000 100" preserveAspectRatio="none">
        <polyline points={ECG_PTS} fill="none" stroke={ALTA} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  );
}

function RjMap({ regioes }: { regioes: EquipeSnapshot["porRegiao"] }) {
  return (
    <div className="tl-mapwrap">
      <svg className="tl-map" viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet">
        {regioes.map((r) => {
          const pos = RJ_POS[r.id];
          if (!pos) return null;
          const [x, y, w, h] = pos;
          const cor = corPct(r.pct);
          return (
            <g key={r.id}>
              <rect
                className="zone"
                x={x}
                y={y}
                width={w}
                height={h}
                rx={2}
                fill={cor}
                fillOpacity={0.1 + Math.min(1, r.pct / 100) * 0.34}
                stroke={cor}
                strokeWidth={0.5}
              />
              <text x={x + 1.6} y={y + 4} className="zn" fill="#e6ecf5" fontSize={2.5}>
                {r.nome.length > 16 ? r.nome.slice(0, 15) + "…" : r.nome}
              </text>
              <text x={x + 1.6} y={y + h - 4.2} className="zn" fill={cor} fontSize={5.2} fontWeight={800}>
                {Math.round(r.pct)}%
              </text>
              <text x={x + 1.6} y={y + h - 1.2} fill="#8893a8" fontSize={2.2}>
                {nf(r.cadastrados)} cad.
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Seal({ real }: { real?: boolean }) {
  return <span className={`seal ${real ? "" : "sim"}`}>{real ? "REAL" : "SIMULADO"}</span>;
}

export function TelaoWall() {
  const equipe = useLiveChannel<EquipeSnapshot>("equipe").data;
  const voz = useLiveChannel<VozSnapshot>("voz").data;
  const pesq = useLiveChannel<PesquisasSnapshot>("pesquisas").data;
  const tape = useLiveChannel<TapeSnapshot>("ticker.tape").data;
  const status = useLiveStatus();
  const clock = useClock();

  const [cfg, setCfg] = useState<Cfg>(loadCfg);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [foco, setFoco] = useState<Scene>("pulso");
  const [alerta, setAlerta] = useState<{ a1: string; a2: string; spk: boolean } | null>(null);

  const audioRef = useRef<AudioContext | null>(null);
  const prevVel = useRef<number | null>(null);
  const lastMile = useRef(0);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // persiste config
  useEffect(() => {
    try {
      localStorage.setItem("telao-cfg", JSON.stringify(cfg));
    } catch {
      /* ignora */
    }
  }, [cfg]);

  // holofote rotativo
  useEffect(() => {
    if (!cfg.rotacao) return;
    const id = setInterval(() => {
      setFoco((f) => SCENES[(SCENES.indexOf(f) + 1) % SCENES.length]);
    }, cfg.intervalo * 1000);
    return () => clearInterval(id);
  }, [cfg.rotacao, cfg.intervalo]);

  const geral = equipe?.geral;
  const metaPct = geral && geral.meta > 0 ? Math.min(100, (geral.cadastrados / geral.meta) * 100) : 0;
  const vel = geral?.velocidadeMin ?? 0;

  // alertas: marco de meta + pico de ritmo
  useEffect(() => {
    const disparar = (a1: string, a2: string, spk: boolean) => {
      requestAnimationFrame(() => setAlerta({ a1, a2, spk }));
      if (alertTimer.current) clearTimeout(alertTimer.current);
      alertTimer.current = setTimeout(() => setAlerta(null), 6500);
      const ctx = audioRef.current;
      if (cfg.som && ctx) {
        if (spk) beep(ctx, 880, 0.16);
        else {
          beep(ctx, 660, 0.18);
          beep(ctx, 990, 0.28, 0.07, 0.18);
        }
      }
    };
    // marco de meta
    const cruzado = MILESTONES.filter((m) => metaPct >= m).pop() ?? 0;
    if (cruzado > lastMile.current) {
      lastMile.current = cruzado;
      disparar(`${cruzado}% DA META`, `${nf(geral?.cadastrados ?? 0)} eleitores cadastrados`, false);
    }
    // pico de ritmo
    if (prevVel.current !== null && vel >= 3 && vel >= prevVel.current * 1.4) {
      disparar("PICO DE CADASTROS", `${vel.toFixed(1)} cadastros por minuto agora`, true);
    }
    prevVel.current = vel;
  }, [metaPct, vel, cfg.som, geral?.cadastrados]);

  function toggleSom() {
    setCfg((c) => {
      const som = !c.som;
      if (som && !audioRef.current) {
        try {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioRef.current = new AC();
          beep(audioRef.current, 720, 0.12); // confirma
        } catch {
          /* sem áudio */
        }
      }
      audioRef.current?.resume?.();
      return { ...c, som };
    });
  }
  function fullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }
  const cls = (k: Scene) => (!cfg.rotacao ? "tl-panel" : `tl-panel ${foco === k ? "foco" : "dim"}`);

  const operadores = [...(equipe?.ranking ?? []), ...(equipe?.lanternas ?? [])]
    .filter((o, i, a) => a.findIndex((x) => x.nome === o.nome) === i)
    .slice(0, 18);
  const live = pesq?.propria?.live;
  const vc = voz?.contadores;
  const sent = vc?.sentimento;
  const sentTot = sent ? sent.pos + sent.neg + sent.neu || 1 : 1;
  const fita = [
    ...(equipe?.feed ?? []).slice(0, 14).map((f) => ({ k: f.id, nome: f.nome, txt: f.acao, neg: false })),
    ...(tape?.nacional ?? []).map((m) => ({ k: m.id, nome: "", txt: m.texto, neg: m.tom === "neg" })),
  ];

  return (
    <div className="telao" data-escala={cfg.escala === "auto" ? undefined : cfg.escala}>
      {alerta ? (
        <div className={`tl-alert ${alerta.spk ? "spk" : ""}`}>
          <div className="a1">{alerta.a1}</div>
          <div className="a2">{alerta.a2}</div>
        </div>
      ) : null}

      {/* HEADER */}
      <header className="tl-head">
        <span className="tl-brand">Sóstenes Cavalcante · PL-RJ</span>
        <span className="tl-title">
          Sala de Guerra — <b>Cadastramento ao vivo</b>
        </span>
        <div className="tl-head-r">
          <span className="tl-clock tl-mono">{clock}</span>
          <span className={`tl-live ${status !== "open" ? "stale" : ""}`}>
            <i />
            {status === "open" ? "Ao vivo" : status === "stale" ? "Reconectando" : "Conectando"}
          </span>
          <button type="button" className={`tl-btn ${cfg.som ? "on" : ""}`} onClick={toggleSom} title="Alertas sonoros">
            {cfg.som ? "🔊" : "🔇"}
          </button>
          <button type="button" className="tl-btn" onClick={fullscreen} title="Tela cheia">
            ⛶
          </button>
          <button type="button" className={`tl-btn ${cfgOpen ? "on" : ""}`} onClick={() => setCfgOpen((v) => !v)}>
            ⚙ Config
          </button>
        </div>
      </header>

      {cfgOpen ? (
        <div className="tl-cfg">
          <div className="ttl">Configuração do telão</div>
          <div className="row">
            <span>Escala (TV)</span>
            <select
              value={cfg.escala}
              onChange={(e) => setCfg((c) => ({ ...c, escala: e.target.value as Escala }))}
            >
              <option value="auto">Auto (fluida)</option>
              <option value="1080">Full HD · 1080p</option>
              <option value="1440">QHD · 1440p</option>
              <option value="4k">4K · 2160p</option>
            </select>
          </div>
          <div className="row">
            <span>Holofote rotativo</span>
            <button type="button" className={`seg ${cfg.rotacao ? "on" : ""}`} onClick={() => setCfg((c) => ({ ...c, rotacao: !c.rotacao }))}>
              {cfg.rotacao ? "Ligado" : "Desligado"}
            </button>
          </div>
          <div className="row">
            <span>Tempo por painel</span>
            <select value={cfg.intervalo} onChange={(e) => setCfg((c) => ({ ...c, intervalo: Number(e.target.value) }))}>
              <option value={12}>12s</option>
              <option value={18}>18s</option>
              <option value={25}>25s</option>
              <option value={40}>40s</option>
            </select>
          </div>
          <div className="row">
            <span>Território</span>
            <button type="button" className={`seg ${cfg.mapa ? "on" : ""}`} onClick={() => setCfg((c) => ({ ...c, mapa: !c.mapa }))}>
              {cfg.mapa ? "Mapa RJ" : "Barras"}
            </button>
          </div>
          <div className="row">
            <span>Alertas sonoros</span>
            <button type="button" className={`seg ${cfg.som ? "on" : ""}`} onClick={toggleSom}>
              {cfg.som ? "Ligado" : "Desligado"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="tl-main">
        {/* ESQUERDA — OPERADORES */}
        <div className="tl-col">
          <div className={cls("operadores")}>
            <div className="tl-panel-h">
              Operadores em campo
              <Seal />
            </div>
            <div className="tl-scroll">
              <div className="tl-wall">
                {operadores.map((o) => (
                  <div className="tl-tile" key={o.nome}>
                    <div className="top">
                      <span className="st" style={{ background: corPct(o.atingimentoPct) }} />
                      <span className="nm">{o.nome}</span>
                      <span className="nv" style={{ color: corNivel(o.nivel) }}>
                        {o.nivel}
                      </span>
                    </div>
                    <div className="mid">
                      <span className="cad tl-mono flash" key={o.cadastrados}>
                        {nf(o.cadastrados)}
                      </span>
                      <span className="pct tl-mono" style={{ color: corPct(o.atingimentoPct) }}>
                        {Math.round(o.atingimentoPct)}%
                      </span>
                    </div>
                    <div className="tk">
                      <i style={{ width: `${Math.min(100, o.atingimentoPct)}%`, background: corPct(o.atingimentoPct) }} />
                    </div>
                  </div>
                ))}
                {operadores.length === 0 ? <div className="tl-empty">Aguardando rede…</div> : null}
              </div>
            </div>
          </div>
        </div>

        {/* CENTRO — PULSO + TERRITÓRIO */}
        <div className="tl-col center">
          <div className={cls("pulso")}>
            <div className="tl-hero">
              <div className="tl-hero-num">
                <span className="lbl">Eleitores cadastrados</span>
                <Odometer className="val" value={geral?.cadastrados ?? 0} />
                <span className="sub">
                  <b className="tl-mono">{vel.toFixed(1)}</b> cadastros/min · engajados{" "}
                  <b className="tl-mono">{nf(geral?.engajados ?? 0)}</b>
                </span>
              </div>
              <div className="tl-hero-r">
                <Ecg />
                <div className="tl-meta">
                  <div className="tl-meta-top">
                    <span>
                      Meta <b className="tl-mono">{nf(geral?.meta ?? 0)}</b>
                    </span>
                    <span>
                      <b className="tl-mono">{metaPct.toFixed(1)}%</b> da meta
                    </span>
                  </div>
                  <div className="tl-track">
                    <i style={{ width: `${metaPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="tl-funil">
              {[
                { k: "Lista", v: equipe?.funil.lista ?? 0 },
                { k: "Cadastro", v: equipe?.funil.cadastro ?? 0 },
                { k: "Engajado", v: equipe?.funil.engajado ?? 0 },
              ].map((s, i, a) => (
                <div className="step" key={s.k}>
                  <div className="k">{s.k}</div>
                  <div className="v tl-mono">{nf(s.v)}</div>
                  <div className="p tl-mono">{i === 0 ? "100%" : `${Math.round((s.v / (a[0].v || 1)) * 100)}%`}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={cls("territorio")}>
            <div className="tl-panel-h">
              Território · regiões do RJ
              <Seal />
            </div>
            {cfg.mapa ? (
              <RjMap regioes={equipe?.porRegiao ?? []} />
            ) : (
              <div className="tl-scroll">
                <div className="tl-reg">
                  {(equipe?.porRegiao ?? []).map((r) => (
                    <div className="tl-reg-row" key={r.id}>
                      <span className="nm">{r.nome}</span>
                      <span className="tl-reg-bar">
                        <i style={{ width: `${Math.min(100, r.pct)}%`, background: corPct(r.pct) }} />
                      </span>
                      <span className="pc tl-mono" style={{ color: corPct(r.pct) }}>
                        {Math.round(r.pct)}%
                      </span>
                      <Spark data={r.spark} cor={corPct(r.pct)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={cls("territorio")}>
            <div className="tl-panel-h">Camadas da rede</div>
            <div className="tl-scroll">
              <div className="tl-reg">
                {(equipe?.tiers ?? []).map((t) => (
                  <div className="tl-reg-row" key={t.nivel} style={{ gridTemplateColumns: "10em 1fr 3.6em 4.4em" }}>
                    <span className="nm" style={{ color: t.cor }}>
                      {t.plural} · {t.count}
                    </span>
                    <span className="tl-reg-bar">
                      <i style={{ width: `${Math.min(100, t.cadastroPct)}%`, background: t.cor }} />
                    </span>
                    <span className="pc tl-mono">{Math.round(t.cadastroPct)}%</span>
                    <span className="tl-mono" style={{ fontSize: "0.62em", color: "var(--ink2)", textAlign: "right" }}>
                      {t.topPerformer.nome.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DIREITA — COMUNICAÇÃO + PESQUISA */}
        <div className="tl-col right">
          <div className={cls("comunicacao")}>
            <div className="tl-panel-h">
              Comunicação com a base
              <Seal />
            </div>
            <div className="tl-kpi">
              <span className="big tl-mono">
                <Odometer value={vc?.porMinuto ?? 0} decimals={1} />
              </span>
              <span className="u">msgs/min</span>
              <span className="u" style={{ marginLeft: "auto" }}>
                hoje <b className="tl-mono" style={{ color: "var(--ink)" }}>{nf(vc?.totalHoje ?? 0)}</b>
              </span>
            </div>
            {sent ? (
              <>
                <div className="tl-seg">
                  <span style={{ width: `${(sent.pos / sentTot) * 100}%`, background: ALTA }} />
                  <span style={{ width: `${(sent.neu / sentTot) * 100}%`, background: "#465063" }} />
                  <span style={{ width: `${(sent.neg / sentTot) * 100}%`, background: BAIXA }} />
                </div>
                <div className="tl-seglg">
                  <span><b style={{ color: ALTA }}>{sent.pos}%</b> positivo</span>
                  <span><b>{sent.neu}%</b> neutro</span>
                  <span><b style={{ color: BAIXA }}>{sent.neg}%</b> negativo</span>
                </div>
              </>
            ) : null}
            <div className="tl-scroll">
              {(voz?.mensagens ?? []).slice(0, 20).map((m) => (
                <div className="tl-msg" key={m.id}>
                  <div className="hd">
                    <span className="tl-dotom" style={{ background: corTom(m.sentimento) }} />
                    <span className="who">{m.nome}</span>
                    <span>· {m.bairro || m.regiao || m.fonte}</span>
                  </div>
                  <div className="tx">{m.texto}</div>
                </div>
              ))}
              {(voz?.mensagens ?? []).length === 0 ? <div className="tl-empty">Sem mensagens ainda…</div> : null}
            </div>
          </div>

          <div className={cls("pesquisa")}>
            <div className="tl-panel-h">
              Pesquisa ao vivo
              <Seal />
            </div>
            {live ? (
              <>
                <div className="tl-q">{pesq?.propria.pergunta}</div>
                <div className="tl-kpi">
                  <span className="big tl-mono" style={{ color: ALTA }}>
                    <Odometer value={live.taxaResposta} decimals={1} suffix="%" />
                  </span>
                  <span className="u">resposta</span>
                  <span className="u" style={{ marginLeft: "auto" }}>
                    <b className="tl-mono" style={{ color: "var(--ink)" }}>{nf(live.respondidos)}</b> de {nf(live.disparados)}
                  </span>
                </div>
                <div className="tl-scroll">
                  {live.porOpcao.map((o) => (
                    <div className="tl-opt" key={o.label}>
                      <div className="hd">
                        <span>{o.label}</span>
                        <span className="v tl-mono" style={{ color: o.cor }}>
                          {Math.round(o.pct)}%
                        </span>
                      </div>
                      <div className="bar">
                        <i style={{ width: `${Math.min(100, o.pct)}%`, background: o.cor }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="tl-empty">Aguardando pesquisa…</div>
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ — fita */}
      <footer className="tl-foot">
        <span className="tag">No ar</span>
        <div className="tl-marquee">
          <div>
            {fita.map((f) => (
              <span className="it" key={f.k}>
                {f.nome ? <b>{f.nome}</b> : null} <span className={f.neg ? "neg" : ""}>{f.txt}</span>
                <span style={{ color: "var(--ink3)", margin: "0 0.25em" }}>·</span>
              </span>
            ))}
            {fita.length === 0 ? <span className="it">Aguardando atividade da rede…</span> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
