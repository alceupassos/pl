"use client";

// Aba CENTRAL DE PESQUISAS — duas frentes em uma tela: a pesquisa PRÓPRIA
// ao vivo (canal SSE atualiza a cada 5s) e o placar OFICIAL dos institutos,
// com ranking de cabeças, tendência por onda, mapa intenção × rejeição,
// leitura por instituto, recortes demográficos e calendário de campo.
// Todo card tem m-card-head, LiveBadge e uma linha de leitura derivada.

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import {
  avatarRacingOption,
  donutOption,
  groupedBarsOption,
  pollTimelineAvatarsOption,
  racingBarOption,
  scatterAvatarOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LazyChart } from "@/components/mobile/ui/lazy-chart";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { avatarForChart } from "@/components/mobile/ui/m-avatar";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import type { PesquisasSnapshot } from "@/lib/live-schemas";

/** Primeiros 2 nomes — rótulo curto para eixos de gráfico. */
function nomeCurto(nome: string): string {
  return nome.split(" ").slice(0, 2).join(" ");
}

/** Rótulos amigáveis dos recortes demográficos. */
const RECORTE_LABEL: Record<string, string> = {
  idade: "Idade",
  renda: "Renda",
  genero: "Gênero",
  escolaridade: "Escolaridade",
};

/* ① PESQUISA PRÓPRIA · AO VIVO — respostas chegando em tempo real */
function PesquisaPropriaCard({ propria }: { propria: PesquisasSnapshot["propria"] }) {
  const live = propria.live;

  const racingOpt = useMemo(
    () =>
      racingBarOption({
        items: live.porOpcao.map((o) => ({ nome: o.label, valor: o.pct, cor: o.cor })),
        max: 100,
      }),
    [live.porOpcao],
  );
  const sparkOpt = useMemo(
    () => sparklineOption(live.serieTempo, "#16C784", { area: true }),
    [live.serieTempo],
  );

  const lider = [...live.porOpcao].sort((a, b) => b.pct - a.pct)[0];

  return (
    <FlashCard watch={live.respondidos}>
      <div className="m-card-head">
        <span className="m-card-title">PESQUISA PRÓPRIA · AO VIVO</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>{propria.pergunta}</p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 6 }}>
        <StatPill label="respondidos" value={live.respondidos} />
        <StatPill label="taxa de resposta" value={live.taxaResposta} decimals={1} suffix="%" />
        <StatPill label="velocidade/min" value={live.velocidade} decimals={1} tone="up" />
      </div>
      <div data-no-swipe>
        <EChart option={racingOpt} height={140} />
      </div>
      <div style={{ marginTop: 6 }}>
        <span className="m-mono m-muted-c" style={{ fontSize: 10 }}>
          chegada de respostas
        </span>
        <EChart option={sparkOpt} height={36} />
      </div>
      <SectionLeitura>
        {lider ? (
          <>
            {lider.label} lidera com {lider.pct.toFixed(1)}% e ainda chegam{" "}
            {live.velocidade.toFixed(1)}/min — amostra própria, leia como tendência.
          </>
        ) : (
          "Aguardando as primeiras respostas da amostra própria."
        )}
      </SectionLeitura>
    </FlashCard>
  );
}

/* ② PLACAR OFICIAL — ranking de institutos com as cabeças dos candidatos */
function PlacarOficial({ ranking }: { ranking: PesquisasSnapshot["oficiais"]["ranking"] }) {
  const option = useMemo(
    () =>
      avatarRacingOption({
        items: ranking.map((c) => ({
          nome: nomeCurto(c.nome),
          valor: c.intencao,
          cor: c.cor,
          img: avatarForChart(c.foto, c.nome, c.cor),
        })),
        suffix: "%",
      }),
    [ranking],
  );

  const ordenado = [...ranking].sort((a, b) => b.intencao - a.intencao);
  const posSost = ordenado.findIndex((c) => c.nome.includes("Sóstenes")) + 1;
  const sost = ordenado.find((c) => c.nome.includes("Sóstenes"));
  const gap = sost ? (ordenado[0].intencao - sost.intencao).toFixed(1) : null;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Placar oficial · Dep. Federal RJ</span>
        <FonteBadge real={false} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          {posSost > 0 ? <span className="m-pill amarelo">você</span> : null}
          <LiveBadge ch="pesquisas" cadenceMs={5000} />
        </span>
      </div>
      <div data-no-swipe>
        <EChart option={option} height={240} />
      </div>
      <SectionLeitura>
        {sost && posSost > 0
          ? posSost === 1
            ? "Você lidera o placar oficial — agora a meta é segurar a ponta."
            : `Você é o ${posSost}º colocado, a ${gap} pp do líder (${nomeCurto(ordenado[0].nome)}).`
          : "Seu nome ainda não aparece neste ranking oficial."}
      </SectionLeitura>
    </div>
  );
}

/* ③ TENDÊNCIA — 6 ondas de pesquisa, linha por candidato com avatar */
function Tendencia({ oficiais }: { oficiais: PesquisasSnapshot["oficiais"] }) {
  const { timeline, ranking } = oficiais;

  const option = useMemo(
    () =>
      pollTimelineAvatarsOption({
        labels: timeline.labels,
        series: timeline.series.map((s) => ({
          nome: s.nome,
          cor: s.cor,
          data: s.data,
          img: avatarForChart(
            ranking.find((c) => c.nome === s.nome)?.foto ?? null,
            s.nome,
            s.cor,
          ),
        })),
      }),
    [timeline, ranking],
  );

  // Quem mais subiu entre a 1ª e a última onda.
  let melhor = { nome: "", delta: -Infinity };
  for (const s of timeline.series) {
    const delta = (s.data[s.data.length - 1] ?? 0) - (s.data[0] ?? 0);
    if (delta > melhor.delta) melhor = { nome: s.nome, delta };
  }

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Tendência · 6 ondas</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <LazyChart option={option} height={200} />
      <SectionLeitura>
        Entre a 1ª e a última onda, quem mais subiu foi {nomeCurto(melhor.nome)} (
        {melhor.delta >= 0 ? "+" : ""}
        {melhor.delta.toFixed(1)} pp) — vigie o movimento dele.
      </SectionLeitura>
    </div>
  );
}

/* ④ INTENÇÃO × REJEIÇÃO — quem é ameaça real no tabuleiro */
function IntencaoRejeicao({ ranking }: { ranking: PesquisasSnapshot["oficiais"]["ranking"] }) {
  const mediaX = ranking.reduce((acc, c) => acc + c.rejeicao, 0) / Math.max(1, ranking.length);
  const mediaY = ranking.reduce((acc, c) => acc + c.intencao, 0) / Math.max(1, ranking.length);

  const option = useMemo(
    () =>
      scatterAvatarOption({
        pontos: ranking.map((c) => ({
          x: c.rejeicao,
          y: c.intencao,
          nome: c.nome,
          cor: c.cor,
          img: avatarForChart(c.foto, c.nome, c.cor),
          destaque: c.nome.includes("Sóstenes"),
        })),
        xLabel: "rejeição %",
        yLabel: "intenção %",
        quadrante: { x: mediaX, y: mediaY },
      }),
    [ranking, mediaX, mediaY],
  );

  // Ameaça real: intenção acima da média com rejeição abaixo da média.
  const ameacas = ranking
    .filter((c) => !c.nome.includes("Sóstenes") && c.intencao >= mediaY && c.rejeicao <= mediaX)
    .sort((a, b) => b.intencao - a.intencao);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Intenção × Rejeição — a ameaça real</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <LazyChart option={option} height={220} />
      <SectionLeitura>
        Cabeça no alto-esquerdo = forte e pouco rejeitado (ameaça real). Atenção a{" "}
        {ameacas.length > 0
          ? ameacas.map((c) => nomeCurto(c.nome)).join(", ")
          : "ninguém nesse quadrante por enquanto"}
        .
      </SectionLeitura>
    </div>
  );
}

/* ⑤ POR INSTITUTO — espalhamento entre as casas de pesquisa */
function PorInstituto({ institutos }: { institutos: PesquisasSnapshot["oficiais"]["institutos"] }) {
  const option = useMemo(
    () =>
      groupedBarsOption({
        labels: institutos.labels,
        series: institutos.series,
        suffix: "%",
      }),
    [institutos],
  );

  // Maior espalhamento (max−min) de um mesmo candidato entre institutos.
  let espalhamento = 0;
  for (const s of institutos.series) {
    if (s.data.length === 0) continue;
    espalhamento = Math.max(espalhamento, Math.max(...s.data) - Math.min(...s.data));
  }

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Por instituto</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <LazyChart option={option} height={190} />
      <SectionLeitura>
        Espalhamento entre institutos de até {espalhamento.toFixed(1)} pp — é a margem real de
        leitura.
      </SectionLeitura>
    </div>
  );
}

/* ⑥ RECORTES DEMOGRÁFICOS — idade, renda, gênero e escolaridade */
function Recortes({ recortes }: { recortes: PesquisasSnapshot["oficiais"]["recortes"] }) {
  const [sel, setSel] = useState("idade");
  const atual = recortes.find((r) => r.recorte === sel) ?? recortes[0];

  const option = useMemo(() => {
    if (!atual) return null;
    return groupedBarsOption({
      labels: atual.labels,
      series: atual.series,
      suffix: "%",
    });
  }, [atual]);

  if (!atual || !option) return null;

  // Série do Sóstenes (ou a 1ª) → segmento de maior valor.
  const minha = atual.series.find((s) => s.nome.includes("Sóstenes")) ?? atual.series[0];
  let melhorIdx = 0;
  for (let i = 1; i < (minha?.data.length ?? 0); i += 1) {
    if ((minha?.data[i] ?? 0) > (minha?.data[melhorIdx] ?? 0)) melhorIdx = i;
  }

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Recortes demográficos</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
        {recortes.map((r) => (
          <button
            key={r.recorte}
            type="button"
            className={`m-pill ${sel === r.recorte ? "amarelo" : ""}`.trim()}
            onClick={() => setSel(r.recorte)}
            aria-pressed={sel === r.recorte}
          >
            {RECORTE_LABEL[r.recorte] ?? r.recorte}
          </button>
        ))}
      </div>
      <div data-no-swipe>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        Seu melhor segmento: {atual.labels[melhorIdx] ?? "—"} (
        {(minha?.data[melhorIdx] ?? 0).toFixed(1)}% em{" "}
        {(RECORTE_LABEL[atual.recorte] ?? atual.recorte).toLowerCase()}).
      </SectionLeitura>
    </div>
  );
}

/* ⑦ SENTIMENTO — tom das respostas abertas da amostra própria */
function Sentimento({ sentimento }: { sentimento: { pos: number; neu: number; neg: number } }) {
  const option = useMemo(
    () =>
      donutOption({
        items: [
          { nome: "Positivo", valor: sentimento.pos, cor: "#16C784" },
          { nome: "Neutro", valor: sentimento.neu, cor: "#8a93a8" },
          { nome: "Negativo", valor: sentimento.neg, cor: "#EA3943" },
        ],
        centro: { valor: `${sentimento.pos}%`, label: "positivo" },
      }),
    [sentimento],
  );

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Sentimento da amostra própria</span>
        <FonteBadge real={false} />
        <LiveBadge ch="pesquisas" cadenceMs={5000} />
      </div>
      <LazyChart option={option} height={150} />
      <SectionLeitura>
        {sentimento.pos}% das respostas vêm com tom positivo;{" "}
        {sentimento.neg > sentimento.pos
          ? "o negativo domina — investigue o motivo antes de ampliar o disparo."
          : "o saldo favorece a campanha."}
      </SectionLeitura>
    </div>
  );
}

/* ⑧ CALENDÁRIO DE CAMPO — o que vai a campo nas próximas semanas */
function Calendario({ calendario }: { calendario: PesquisasSnapshot["calendario"] }) {
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Calendário de campo</span>
        <FonteBadge real={false} />
        <span className="m-pill">{calendario.length} semanas</span>
      </div>
      <div>
        {calendario.map((c) => (
          <div className="m-row" key={c.semana}>
            <span className="m-mono m-muted-c" style={{ fontSize: 11 }}>
              {c.semana}
            </span>
            <span style={{ display: "flex", gap: 8, alignItems: "center", textAlign: "right" }}>
              <span className="m-pill">{c.tema}</span>
              <span className="m-feed-meta">{c.objetivo}</span>
            </span>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Cada semana tem um tema de campo — alinhe a agenda do candidato ao que está sendo medido.
      </SectionLeitura>
    </div>
  );
}

export default function PesquisasTab() {
  const data = useLiveChannel<PesquisasSnapshot>("pesquisas").data;
  if (!data || !("oficiais" in data)) {
    return <div className="m-ghost">sincronizando com a central de pesquisas…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <PesquisaPropriaCard propria={data.propria} />
      <PlacarOficial ranking={data.oficiais.ranking} />
      <Tendencia oficiais={data.oficiais} />
      <IntencaoRejeicao ranking={data.oficiais.ranking} />
      <PorInstituto institutos={data.oficiais.institutos} />
      <Recortes recortes={data.oficiais.recortes} />
      <Sentimento sentimento={data.propria.live.sentimento} />
      <Calendario calendario={data.calendario} />
      <MOraculo
        section="m-pesquisas"
        context={`respondidos=${data.propria.live.respondidos}`}
      />
    </div>
  );
}
