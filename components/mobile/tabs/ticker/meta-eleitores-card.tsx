"use client";

// HERO da página 1 — o que mais importa: cadastro de eleitores vs a meta de
// 79.000, onde DEVERIA estar hoje, quanto falta, dias até a eleição (out/2026)
// e se o ritmo fecha a meta. Linguagem de leigo, sem jargão de bolsa.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { bulletBarsOption, funnelOption } from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";

import { MAvatar } from "@/components/mobile/ui/m-avatar";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { getAvatar } from "@/lib/avatars";
import {
  ELEICAO_MS,
  META_ELEITORES,
  diasAteEleicao,
  previstoPara,
} from "@/lib/mock/campaign-goal";
import type { EquipeSnapshot } from "@/lib/live-schemas";

/* ── FRENTE: o placar do cadastro de eleitores vs a meta ── */
function MetaFront() {
  const { data: equipe, lastAt } = useLiveChannel<EquipeSnapshot>("equipe");

  const calc = useMemo(() => {
    if (!equipe) return null;
    const g = equipe.geral;
    const agora = lastAt > 0 ? lastAt : ELEICAO_MS - 130 * 86_400_000;
    const cadastrados = g.cadastrados;
    const previsto = previstoPara(agora);
    const faltam = Math.max(0, META_ELEITORES - cadastrados);
    const pct = Math.min(100, (cadastrados / META_ELEITORES) * 100);
    const pctPrevisto = Math.min(100, (previsto / META_ELEITORES) * 100);
    const dias = diasAteEleicao(agora);
    const ritmoDia = Math.round(g.velocidadeMin * 60 * 14);
    const ritmoNec = Math.ceil(faltam / dias);
    const diff = cadastrados - previsto;
    const margem = META_ELEITORES * 0.03;
    const status = diff >= margem ? "ADIANTADO" : diff <= -margem ? "ATRASADO" : "NO RITMO";
    const cor = status === "ADIANTADO" ? "#16C784" : status === "ATRASADO" ? "#EA3943" : "#F5A623";
    const selo = status === "ADIANTADO" ? "up" : status === "ATRASADO" ? "down" : "amarelo";
    // projeção no ritmo atual até a eleição
    const pts = Array.from({ length: 9 }, (_, i) =>
      Math.round(cadastrados + ritmoDia * dias * (i / 8)),
    );
    const option = {
      backgroundColor: "transparent",
      grid: { left: 4, right: 10, top: 12, bottom: 16, containLabel: true },
      xAxis: {
        type: "category",
        data: pts.map((_, i) => (i === 0 ? "hoje" : i === 8 ? "out" : "")),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#2a3346" } },
        axisLabel: { color: "#8a93a8", fontSize: 9 },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
        axisLabel: { color: "#8a93a8", fontSize: 9, formatter: (v: number) => `${Math.round(v / 1000)}k` },
      },
      series: [
        {
          type: "line",
          data: pts,
          smooth: true,
          symbol: "none",
          lineStyle: { color: cor, width: 2 },
          areaStyle: { color: status === "ATRASADO" ? "rgba(234,57,67,0.10)" : "rgba(22,199,132,0.10)" },
          markLine: {
            silent: true,
            symbol: "none",
            data: [{ yAxis: META_ELEITORES }],
            lineStyle: { color: "#F5A623", type: "dashed" },
            label: { formatter: "meta 79k", color: "#F5A623", fontSize: 9, position: "insideEndTop" },
          },
        },
      ],
    };
    return { cadastrados, previsto, faltam, pct, pctPrevisto, dias, ritmoDia, ritmoNec, status, cor, selo, option };
  }, [equipe, lastAt]);

  return (
    <FlashCard watch={calc?.cadastrados}>
      <div className="m-card-head">
        <span className="m-card-title">Cadastro de eleitores · meta 79.000</span>
        {calc ? (
          <LeituraIA
            card="ticker-meta"
            contexto={`cad ${calc.cadastrados}/${META_ELEITORES}; ${calc.status}; ritmo ${calc.ritmoDia}/dia; nec ${calc.ritmoNec}/dia; faltam ${calc.faltam}`}
            titulo="Meta eleitores"
          />
        ) : null}
        <FonteBadge real={false} />
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>

      {calc ? (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <div className="m-headline-num">
              <Odometer value={calc.cadastrados} />
            </div>
            <span className="m-muted-c" style={{ fontSize: 14 }}>
              / {META_ELEITORES.toLocaleString("pt-BR")}
            </span>
            <span className={`m-pill ${calc.selo}`} style={{ marginLeft: "auto" }}>
              {calc.status === "ADIANTADO" ? "ADIANTADO ✓" : calc.status === "ATRASADO" ? "ATRASADO ⚠" : "NO RITMO"}
            </span>
          </div>

          {/* barra com marcador de "previsto para hoje" */}
          <div className="m-meta-bar">
            <span className="m-meta-fill" style={{ width: `${calc.pct}%`, background: calc.cor }} />
            <span className="m-meta-tick" style={{ left: `${calc.pctPrevisto}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, marginTop: 3 }}>
            <span className="m-mono">{calc.pct.toFixed(0)}% da meta</span>
            <span className="m-muted-c">▏previsto p/ hoje: {calc.previsto.toLocaleString("pt-BR")}</span>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "8px 0 2px" }}>
            <Stat label="faltam" valor={`${calc.faltam.toLocaleString("pt-BR")}`} />
            <Stat label="dias p/ eleição" valor={`${calc.dias}`} sub="~4 meses" />
            <Stat label="ritmo atual" valor={`${calc.ritmoDia}/dia`} />
            <Stat label="ritmo necessário" valor={`${calc.ritmoNec}/dia`} />
          </div>

          <div style={{ marginTop: 6 }}>
            <div className="m-muted-c" style={{ fontSize: 10.5, marginBottom: 2 }}>
              chegada realista de cadastros até a eleição
            </div>
            <EChart option={calc.option} height={120} />
          </div>

          <SectionLeitura>
            {calc.status === "ATRASADO"
              ? `Está ${(calc.previsto - calc.cadastrados).toLocaleString("pt-BR")} eleitores atrás do previsto. No ritmo atual (${calc.ritmoDia}/dia) a meta NÃO fecha — é preciso ${calc.ritmoNec}/dia. Muito trabalho pela frente.`
              : calc.status === "ADIANTADO"
                ? `Adiantado em relação ao plano: ${(calc.cadastrados - calc.previsto).toLocaleString("pt-BR")} à frente. Mantendo ${calc.ritmoDia}/dia, a meta de 79 mil é batida antes de outubro.`
                : `No ritmo planejado. Para garantir os 79 mil até outubro, manter ~${calc.ritmoNec} cadastros/dia.`}
          </SectionLeitura>

          <div className="m-flip-hint">↻ toque para ver de onde vêm os cadastros</div>
        </>
      ) : (
        <div className="m-ghost">sincronizando o placar…</div>
      )}
    </FlashCard>
  );
}

/* ── VERSO: de onde vêm os cadastros — por região e funil de conversão ── */
function MetaBack() {
  const equipe = useLiveChannel<EquipeSnapshot>("equipe").data;

  const charts = useMemo(() => {
    if (!equipe) return null;
    const regioes = equipe.porRegiao.slice(0, 6);
    // barras-alvo: cadastrados vs meta por região
    const bullet = bulletBarsOption({
      items: regioes.map((r) => ({ nome: r.nome, atual: r.cadastrados, meta: r.meta })),
      suffix: "",
    });
    // funil de conversão: lista → cadastrados → engajados
    const f = equipe.funil;
    const funnel = funnelOption({
      etapas: [
        { nome: "Lista", valor: f.lista, cor: "#3b82f6" },
        { nome: "Cadastrados", valor: f.cadastro, cor: "#16C784" },
        { nome: "Engajados", valor: f.engajado, cor: "#F5A623" },
      ],
    });
    // região mais fraca (menor % da meta) — para reforçar
    const fraca = [...equipe.porRegiao].sort((a, b) => a.pct - b.pct)[0];
    return { bullet, funnel, fraca };
  }, [equipe]);

  if (!equipe || !charts) {
    return (
      <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
        <div className="m-ghost">sincronizando origens…</div>
      </div>
    );
  }

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MAvatar src={getAvatar("eleitor")} nome="Eleitores" cor="#16C784" size={26} />
          <span className="m-card-title">Como funciona este card</span>
        </span>
      </div>

      {/* como funciona: previsto, ritmo e projeção */}
      <div
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          background: "var(--m-card-2)",
          border: "1px solid var(--m-border)",
          marginBottom: 8,
        }}
      >
        <p style={{ fontSize: 11, lineHeight: 1.55, margin: "0 0 5px", color: "#cfd6e4" }}>
          <strong>Previsto para hoje</strong> — a meta de {META_ELEITORES.toLocaleString("pt-BR")}{" "}
          eleitores é dividida numa linha reta do início da campanha até a eleição (out/2026); o
          marcador ▏na barra mostra onde o cadastro deveria estar hoje nesse plano.
        </p>
        <p style={{ fontSize: 11, lineHeight: 1.55, margin: "0 0 5px", color: "#cfd6e4" }}>
          <strong>Ritmo atual × necessário</strong> — o ritmo atual vem da velocidade de cadastro
          medida agora (cadastros/min × 14h de operação/dia); o necessário é o que falta dividido
          pelos dias até a eleição.
        </p>
        <p style={{ fontSize: 11, lineHeight: 1.55, margin: 0, color: "#cfd6e4" }}>
          <strong>Projeção</strong> — a curva do card estende o ritmo atual até outubro: se cruza a
          linha da meta antes da eleição, o selo fica <span style={{ color: "#16C784" }}>ADIANTADO</span>;
          se não cruza, <span style={{ color: "#EA3943" }}>ATRASADO</span>.
        </p>
      </div>

      <div className="m-card-head" style={{ borderTop: "1px solid var(--m-border)", paddingTop: 8 }}>
        <span className="m-card-title">De onde vêm os cadastros</span>
      </div>

      {/* cadastrados vs meta por região */}
      <div className="m-muted-c" style={{ fontSize: 10.5, margin: "2px 0 2px" }}>
        cadastrados × meta por região
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={charts.bullet} height={150} />
      </div>

      {/* funil: lista → cadastrados → engajados */}
      <div className="m-muted-c" style={{ fontSize: 10.5, margin: "8px 0 2px" }}>
        funil de conversão
      </div>
      <EChart option={charts.funnel} height={150} />

      <SectionLeitura>
        {charts.fraca
          ? `${charts.fraca.nome} é a região mais fraca (${charts.fraca.pct.toFixed(0)}% da meta) — reforce o cadastro por lá para não travar o placar geral.`
          : "Acompanhe as origens para reforçar as regiões que estão puxando o placar para baixo."}
      </SectionLeitura>
    </div>
  );
}

export function MetaEleitoresCard() {
  const equipe = useLiveChannel<EquipeSnapshot>("equipe").data;
  if (!equipe) {
    return (
      <FlashCard watch={undefined}>
        <div className="m-card-head">
          <span className="m-card-title">Cadastro de eleitores · meta 79.000</span>
          <LiveBadge ch="equipe" cadenceMs={2000} />
        </div>
        <div className="m-ghost">sincronizando o placar…</div>
      </FlashCard>
    );
  }
  return <FlipCard front={<MetaFront />} back={<MetaBack />} />;
}

function Stat({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div>
      <div className="m-muted-c" style={{ fontSize: 9.5, letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </div>
      <div className="m-mono" style={{ fontSize: 15, fontWeight: 800 }}>{valor}</div>
      {sub ? <div className="m-muted-c" style={{ fontSize: 9 }}>{sub}</div> : null}
    </div>
  );
}
