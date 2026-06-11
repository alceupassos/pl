"use client";

// Aba EQUIPE DE CAMPO — a máquina de cadastro em camadas: hero com a meta
// geral, cadastros por região em tempo real, as 3 camadas de líderes (+ cabos
// e eleitores), funil da base, ranking de líderes e feed de atividade ao vivo.
// O canal SSE "equipe" entrega snapshot + deltas a cada 2s; aqui só lemos.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  avatarRacingOption,
  funnelOption,
  mGaugeOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { LazyChart } from "@/components/mobile/ui/lazy-chart";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MAvatar, avatarForChart } from "@/components/mobile/ui/m-avatar";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import { getAvatar } from "@/lib/avatars";
import type { EquipeSnapshot } from "@/lib/live-schemas";

// Cores por nível da operação (mesma paleta dos avatares das camadas).
const NIVEL_COR: Record<string, string> = {
  "church-leader": "#8b5cf6",
  "regional-manager": "#3b82f6",
  "state-deputy": "#F5A623",
};

function corDoNivel(nivel: string): string {
  return NIVEL_COR[nivel] ?? "#16C784";
}

function fmtK(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k` : String(Math.round(v));
}

/* ① HERO — eleitores cadastrados × meta geral */
function HeroCadastros({ equipe }: { equipe: EquipeSnapshot }) {
  const g = equipe.geral;
  const pctMeta = (g.cadastrados / Math.max(1, g.meta)) * 100;
  const gauge = useMemo(
    () => mGaugeOption({ pct: Math.min(100, pctMeta), label: "da meta geral" }),
    [pctMeta],
  );
  // Dias úteis (14h de operação) para fechar a meta no ritmo atual.
  const diasParaMeta =
    g.velocidadeMin > 0
      ? Math.max(0, Math.round((g.meta - g.cadastrados) / (g.velocidadeMin * 60 * 14)))
      : null;

  return (
    <FlashCard watch={g.cadastrados}>
      <div className="m-card-head">
        <span className="m-card-title">Eleitores cadastrados</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div className="m-headline-num">
        <Odometer value={g.cadastrados} />
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0" }}>
        <StatPill label="velocidade/min" value={g.velocidadeMin} decimals={1} tone="up" />
        <StatPill label="engajados" value={g.engajados} />
        <StatPill label="meta" value={g.meta} />
      </div>
      <EChart option={gauge} height={130} />
      <SectionLeitura>
        {diasParaMeta !== null
          ? `No ritmo de ${g.velocidadeMin.toFixed(1)}/min, a meta fecha em ~${diasParaMeta} dias úteis de operação (14h/dia).`
          : "Sem ritmo de cadastro registrado agora — a projeção da meta fica suspensa."}
      </SectionLeitura>
    </FlashCard>
  );
}

/* ② CADASTROS POR REGIÃO — grid 2 colunas com sparkline e barra de meta */
function RegiaoMini({ regiao }: { regiao: EquipeSnapshot["porRegiao"][number] }) {
  const spark = useMemo(
    () => sparklineOption(regiao.spark, "#16C784", { area: true }),
    [regiao.spark],
  );
  const corBarra =
    regiao.pct >= 100 ? "#16C784" : regiao.pct >= 70 ? "#F5A623" : "#EA3943";
  return (
    <div
      style={{
        border: "1px solid var(--m-border)",
        borderRadius: 10,
        padding: "8px 10px",
        minWidth: 0,
      }}
    >
      <div className="m-muted-c" style={{ fontSize: 10.5, marginBottom: 2 }}>
        {regiao.nome}
      </div>
      <div className="m-mono" style={{ fontSize: 16, fontWeight: 800 }}>
        <Odometer value={regiao.cadastrados} />
      </div>
      <LazyChart option={spark} height={22} />
      <div className="m-bar" style={{ marginTop: 4 }}>
        <span style={{ width: `${Math.min(100, regiao.pct)}%`, background: corBarra }} />
      </div>
      <div className="m-mono m-muted-c" style={{ fontSize: 9.5, marginTop: 2 }}>
        {regiao.pct.toFixed(0)}% da meta
      </div>
    </div>
  );
}

function PorRegiao({ equipe }: { equipe: EquipeSnapshot }) {
  const ordenado = [...equipe.porRegiao].sort((a, b) => b.pct - a.pct);
  const melhor = ordenado[0];
  const pior = ordenado[ordenado.length - 1];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Cadastros por região · tempo real</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {equipe.porRegiao.map((r) => (
          <RegiaoMini key={r.id} regiao={r} />
        ))}
      </div>
      <SectionLeitura>
        {melhor ? `${melhor.nome} lidera com ${melhor.pct.toFixed(0)}% da meta` : "Sem regiões"}
        {pior && pior !== melhor
          ? `; ${pior.nome} é a lanterna (${pior.pct.toFixed(0)}%) — reforce o campo aí.`
          : "."}
      </SectionLeitura>
    </div>
  );
}

/* ③ AS 3 CAMADAS DA OPERAÇÃO — carrossel de tiers (líderes, cabos, eleitores) */
function Camadas({ equipe }: { equipe: EquipeSnapshot }) {
  const eloFraco = [...equipe.tiers].sort((a, b) => a.engajadoPct - b.engajadoPct)[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">As 3 camadas da operação</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div className="m-carousel" data-no-swipe>
        {equipe.tiers.map((tier) => (
          <article
            key={tier.nivel}
            className="m-quote-card"
            style={{ flexBasis: 220, borderTop: `2px solid ${tier.cor}` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MAvatar src={tier.avatar} nome={tier.nome} cor={tier.cor} size={40} />
              <span>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 700 }}>
                  {tier.nome}
                </span>
                <span className="m-muted-c" style={{ display: "block", fontSize: 10 }}>
                  {tier.plural}
                </span>
              </span>
            </div>
            <div className="m-mono" style={{ fontSize: 20, fontWeight: 800, margin: "6px 0" }}>
              <Odometer value={tier.count} />
            </div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
              <span className="m-pill up">cadastro {tier.cadastroPct.toFixed(0)}%</span>
              <span className="m-pill amarelo">engajado {tier.engajadoPct.toFixed(0)}%</span>
            </div>
            <div className="m-muted-c" style={{ fontSize: 10.5 }}>
              top: <strong style={{ color: tier.cor }}>{tier.topPerformer.nome}</strong>{" "}
              <span className="m-mono">{tier.topPerformer.pct.toFixed(0)}%</span>
            </div>
          </article>
        ))}
      </div>
      <SectionLeitura>
        {eloFraco
          ? `Camada ${eloFraco.nome} é o elo mais fraco da corrente (${eloFraco.engajadoPct.toFixed(0)}% de engajamento) — é nela que a cobrança rende mais.`
          : "Sem camadas para ler agora."}
      </SectionLeitura>
    </div>
  );
}

/* ④ FUNIL DA BASE — lista → cadastrados → engajados */
function FunilBase({ equipe }: { equipe: EquipeSnapshot }) {
  const f = equipe.funil;
  const option = useMemo(
    () =>
      funnelOption({
        etapas: [
          { nome: "Lista", valor: f.lista, cor: "#3b82f6" },
          { nome: "Cadastrados", valor: f.cadastro, cor: "#16C784" },
          { nome: "Engajados", valor: f.engajado, cor: "#F5A623" },
        ],
      }),
    [f.lista, f.cadastro, f.engajado],
  );
  const quedaCadastro = ((f.lista - f.cadastro) / Math.max(1, f.lista)) * 100;
  const quedaEngajado = ((f.cadastro - f.engajado) / Math.max(1, f.cadastro)) * 100;
  const gargalo =
    quedaCadastro >= quedaEngajado
      ? { etapa: "lista → cadastro", queda: quedaCadastro }
      : { etapa: "cadastro → engajado", queda: quedaEngajado };
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Funil da base</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <LazyChart option={option} height={170} />
      <SectionLeitura>
        A maior queda é em {gargalo.etapa} ({gargalo.queda.toFixed(0)}% se perdem) — é o gargalo
        da operação.
      </SectionLeitura>
    </div>
  );
}

/* ⑤ RANKING DE LÍDERES — racing bar com avatar por camada */
function RankingLideres({ equipe }: { equipe: EquipeSnapshot }) {
  const top8 = equipe.ranking.slice(0, 8);
  const option = useMemo(
    () =>
      avatarRacingOption({
        items: top8.map((l) => {
          const cor = corDoNivel(l.nivel);
          return {
            nome: l.nome.split(" ").slice(0, 2).join(" "),
            valor: l.atingimentoPct,
            cor,
            img: avatarForChart(getAvatar(l.nivel), l.nome, cor),
          };
        }),
        suffix: "%",
      }),
    [top8],
  );
  const lider = [...top8].sort((a, b) => b.atingimentoPct - a.atingimentoPct)[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Ranking de líderes</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={220} />
      </div>
      <SectionLeitura>
        {lider
          ? `${lider.nome} é o nº 1 (${lider.regiao}): ${lider.atingimentoPct.toFixed(0)}% da meta — ${
              lider.atingimentoPct >= 100
                ? `supera a meta em ${(lider.atingimentoPct - 100).toFixed(0)} pontos, com ${fmtK(lider.cadastrados)} cadastros.`
                : `faltam ${(100 - lider.atingimentoPct).toFixed(0)} pontos para bater a meta.`
            }`
          : "Sem ranking para exibir."}
      </SectionLeitura>
    </div>
  );
}

/* ⑥ ATIVIDADE AO VIVO — feed dos últimos movimentos da máquina de campo */
function horaRelativa(lastAt: number | null | undefined, t: number): string {
  // Idade derivada do relógio do canal (lastAt), nunca de Date.now() no render.
  if (!lastAt) return "agora";
  const min = Math.max(0, Math.round((lastAt - t) / 60_000));
  return min < 1 ? "agora" : `há ${min}min`;
}

function FeedItem({
  item,
  lastAt,
}: {
  item: EquipeSnapshot["feed"][number];
  lastAt: number | null | undefined;
}) {
  return (
    <div className="m-feed-item">
      <MAvatar src={getAvatar(item.nivel)} nome={item.nome} cor={item.cor} size={26} />
      <div style={{ minWidth: 0 }}>
        <div className="m-feed-title">
          <strong>{item.nome}</strong> {item.acao}
        </div>
        <div className="m-feed-meta">
          <span style={{ color: item.cor }}>{item.nivel}</span> · {horaRelativa(lastAt, item.t)}
        </div>
      </div>
    </div>
  );
}

function AtividadeAoVivo({
  equipe,
  lastAt,
}: {
  equipe: EquipeSnapshot;
  lastAt: number | null | undefined;
}) {
  const itens = equipe.feed.slice(0, 10);
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Atividade ao vivo</span>
        <LiveBadge ch="equipe" cadenceMs={2000} />
      </div>
      <div>
        {itens.map((item, i) =>
          i === 0 ? (
            <FlashCard key={item.id} watch={equipe.feed[0]?.t}>
              <FeedItem item={item} lastAt={lastAt} />
            </FlashCard>
          ) : (
            <FeedItem key={item.id} item={item} lastAt={lastAt} />
          ),
        )}
      </div>
      <SectionLeitura>
        Cada linha é um movimento real da máquina de campo — cadastro, grupo novo, meta batida.
      </SectionLeitura>
    </div>
  );
}

export default function EquipeTab() {
  const { data, lastAt } = useLiveChannel<EquipeSnapshot>("equipe");
  if (!data) {
    return <div className="m-ghost">sincronizando…</div>;
  }

  const piorRegiao = [...data.porRegiao].sort((a, b) => a.pct - b.pct)[0];
  const eloFraco = [...data.tiers].sort((a, b) => a.engajadoPct - b.engajadoPct)[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <HeroCadastros equipe={data} />
      <PorRegiao equipe={data} />
      <Camadas equipe={data} />
      <FunilBase equipe={data} />
      <RankingLideres equipe={data} />
      <AtividadeAoVivo equipe={data} lastAt={lastAt} />
      <MOraculo
        section="m-equipe"
        context={`pior região ${piorRegiao?.nome ?? "?"} (${piorRegiao?.pct.toFixed(0) ?? "?"}% da meta); elo mais fraco: camada ${eloFraco?.nome ?? "?"} com ${eloFraco?.engajadoPct.toFixed(0) ?? "?"}% de engajamento; cadastrados ${data.geral.cadastrados} de ${data.geral.meta}`}
      />
    </div>
  );
}
