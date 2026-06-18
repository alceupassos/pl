"use client";

// Telão "Sala de Guerra" — centro de controle ao vivo da campanha.
// Consome o SSE /api/stream (canais equipe/voz/pesquisas/ticker) via o provider
// do /m. Visual de terminal: números mono, semáforo alta/baixa, ECG-assinatura.

import { useEffect, useState } from "react";

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

function corNivel(n: string): string {
  const s = n.toLowerCase();
  if (s.includes("igreja") || s.includes("church") || s.includes("líder") || s.includes("lider"))
    return "#a78bfa";
  if (s.includes("gerente") || s.includes("regional")) return "#4c82f0";
  if (s.includes("deput") || s.includes("state")) return "#f5a623";
  return "#16c784"; // cabo / eleitor
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

/* ── relógio 1s ── */
function useClock(): string {
  const [s, setS] = useState("--:--:--");
  useEffect(() => {
    const fmt = () =>
      setS(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    fmt();
    const id = setInterval(fmt, 1000);
    return () => clearInterval(id);
  }, []);
  return s;
}

/* ── sparkline ── */
function Spark({ data, cor }: { data: number[]; cor: string }) {
  if (!data || data.length < 2) return <svg className="tl-spark" />;
  const w = 54;
  const h = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="tl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/* ── ECG-assinatura (batimento da campanha) ── */
function buildEcg(): string {
  const cell = 250;
  const cells = 8; // 2000 = 2 metades idênticas (loop -50% perfeito)
  const beat = [
    [0, 50], [92, 50], [104, 44], [116, 50], [128, 50],
    [150, 62], [160, 12], [170, 66], [182, 50],
    [210, 44], [222, 50], [250, 50],
  ];
  const out: string[] = [];
  for (let c = 0; c < cells; c++) {
    for (const [x, y] of beat) out.push(`${(c * cell + x).toFixed(0)},${y}`);
  }
  return out.join(" ");
}
const ECG_PTS = buildEcg();

function Ecg() {
  return (
    <div className="tl-ecgwrap">
      <svg className="tl-ecg" viewBox="0 0 2000 100" preserveAspectRatio="none">
        <polyline
          points={ECG_PTS}
          fill="none"
          stroke={ALTA}
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.9"
        />
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

  const geral = equipe?.geral;
  const metaPct = geral && geral.meta > 0 ? Math.min(100, (geral.cadastrados / geral.meta) * 100) : 0;

  // muro de operadores: melhores + piores (lanternas)
  const operadores = [...(equipe?.ranking ?? []), ...(equipe?.lanternas ?? [])]
    .filter((o, i, a) => a.findIndex((x) => x.nome === o.nome) === i)
    .slice(0, 18);

  const live = pesq?.propria?.live;
  const vc = voz?.contadores;
  const sent = vc?.sentimento;
  const sentTot = sent ? sent.pos + sent.neg + sent.neu || 1 : 1;

  // fita do rodapé: ações da equipe + manchetes
  const fita = [
    ...(equipe?.feed ?? []).slice(0, 14).map((f) => ({ k: f.id, nome: f.nome, txt: f.acao, neg: false })),
    ...(tape?.nacional ?? []).map((m) => ({ k: m.id, nome: "", txt: m.texto, neg: m.tom === "neg" })),
  ];

  return (
    <div className="telao">
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
        </div>
      </header>

      <div className="tl-main">
        {/* COLUNA ESQUERDA — OPERADORES */}
        <div className="tl-col">
          <div className="tl-panel">
            <div className="tl-panel-h">
              Operadores em campo
              <Seal />
            </div>
            <div className="tl-scroll">
              <div className="tl-wall">
                {operadores.map((o) => {
                  const cor = corNivel(o.nivel);
                  return (
                    <div className="tl-tile" key={o.nome}>
                      <div className="top">
                        <span className="st" style={{ background: corPct(o.atingimentoPct) }} />
                        <span className="nm">{o.nome}</span>
                        <span className="nv" style={{ color: cor }}>
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
                        <i
                          style={{
                            width: `${Math.min(100, o.atingimentoPct)}%`,
                            background: corPct(o.atingimentoPct),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                {operadores.length === 0 ? <div className="tl-empty">Aguardando rede…</div> : null}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA CENTRO — PULSO + TERRITÓRIO */}
        <div className="tl-col center">
          {/* hero pulso */}
          <div className="tl-panel">
            <div className="tl-hero">
              <div className="tl-hero-num">
                <span className="lbl">Eleitores cadastrados</span>
                <Odometer className="val" value={geral?.cadastrados ?? 0} />
                <span className="sub">
                  <b className="tl-mono">{(geral?.velocidadeMin ?? 0).toFixed(1)}</b> cadastros/min ·{" "}
                  engajados <b className="tl-mono">{nf(geral?.engajados ?? 0)}</b>
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
                  <div className="p tl-mono">
                    {i === 0 ? "100%" : `${Math.round((s.v / (a[0].v || 1)) * 100)}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* territorio */}
          <div className="tl-panel">
            <div className="tl-panel-h">
              Território · regiões do RJ
              <Seal />
            </div>
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
                {(equipe?.porRegiao ?? []).length === 0 ? (
                  <div className="tl-empty">Aguardando regiões…</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* tiers */}
          <div className="tl-panel">
            <div className="tl-panel-h">Camadas da rede</div>
            <div className="tl-scroll">
              <div className="tl-reg">
                {(equipe?.tiers ?? []).map((t) => (
                  <div className="tl-reg-row" key={t.nivel} style={{ gridTemplateColumns: "160px 1fr 64px 70px" }}>
                    <span className="nm" style={{ color: t.cor }}>
                      {t.plural} · {t.count}
                    </span>
                    <span className="tl-reg-bar">
                      <i style={{ width: `${Math.min(100, t.cadastroPct)}%`, background: t.cor }} />
                    </span>
                    <span className="pc tl-mono">{Math.round(t.cadastroPct)}%</span>
                    <span className="tl-mono" style={{ fontSize: 10, color: "var(--ink2)", textAlign: "right" }}>
                      {t.topPerformer.nome.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA — COMUNICAÇÃO + PESQUISA */}
        <div className="tl-col right">
          <div className="tl-panel">
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
                  <span>
                    <b style={{ color: ALTA }}>{sent.pos}%</b> positivo
                  </span>
                  <span>
                    <b>{sent.neu}%</b> neutro
                  </span>
                  <span>
                    <b style={{ color: BAIXA }}>{sent.neg}%</b> negativo
                  </span>
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
              {(voz?.mensagens ?? []).length === 0 ? (
                <div className="tl-empty">Sem mensagens ainda…</div>
              ) : null}
            </div>
          </div>

          <div className="tl-panel">
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
                    <b className="tl-mono" style={{ color: "var(--ink)" }}>{nf(live.respondidos)}</b> de{" "}
                    {nf(live.disparados)}
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
                <span style={{ color: "var(--ink3)", margin: "0 4px" }}>·</span>
              </span>
            ))}
            {fita.length === 0 ? <span className="it">Aguardando atividade da rede…</span> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
