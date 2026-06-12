"use client";

// Aba GASTOS — o caixa da campanha como um cockpit financeiro: saldo vivo,
// execução semanal planejado × realizado × projeção, burn rate, origem do
// dinheiro, rubricas em bullet, custo por voto e alertas de estouro. Todo
// card tem m-card-head + linha de leitura derivada dos próprios dados.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  bulletBarsOption,
  donutOption,
  financeLinesOption,
  groupedBarsOption,
  mGaugeOption,
} from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { LazyChart } from "@/components/mobile/ui/lazy-chart";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import type { GastosState } from "@/lib/live-schemas";

// % da campanha já decorrida (referência fixa para ritmo de execução).
const PCT_CAMPANHA_DECORRIDA = 65;

/** Valores chegam em R$ MIL: >= 1000 vira "R$ 1,01 mi", senão "R$ 530 mil". */
function fmtRS(v: number): string {
  if (Math.abs(v) >= 1000) {
    return `R$ ${(v / 1000).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} mi`;
  }
  return `R$ ${Math.round(v).toLocaleString("pt-BR")} mil`;
}

/* ① HERO — caixa da campanha. FRENTE: disponível gigante + gauge de execução.
   VERSO (toque): execução planejado × realizado × projeção — quando o caixa
   acaba e em que ritmo. */
function CaixaHeroFront({ gastos }: { gastos: GastosState }) {
  const { saldo } = gastos;
  const emMi = saldo.disponivel >= 1000;
  const corGauge =
    saldo.pctExecutado < 70 ? "#16C784" : saldo.pctExecutado < 90 ? "#F5A623" : "#EA3943";
  const gauge = useMemo(
    () =>
      mGaugeOption({
        pct: saldo.pctExecutado,
        cor: corGauge,
        label: "do orçamento executado",
      }),
    [saldo.pctExecutado, corGauge],
  );
  const ritmo = saldo.pctExecutado <= PCT_CAMPANHA_DECORRIDA ? "ritmo ok" : "ritmo acima";

  return (
    <FlashCard watch={saldo.gasto}>
      <div className="m-card-head">
        <span className="m-card-title">Caixa da campanha</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <div className="m-headline-num">
        <Odometer
          value={emMi ? saldo.disponivel / 1000 : saldo.disponivel}
          decimals={emMi ? 2 : 0}
          prefix="R$ "
          suffix={emMi ? " mi" : " mil"}
        />
      </div>
      <div className="m-mono m-muted-c" style={{ fontSize: 10.5, marginBottom: 8 }}>
        disponível em caixa
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 4 }}>
        <StatPill label="orçamento total (R$ mil)" value={saldo.total} />
        <StatPill label="já gasto (R$ mil)" value={saldo.gasto} tone="warn" />
        <StatPill label="executado" value={saldo.pctExecutado} decimals={1} suffix="%" />
      </div>
      <LazyChart option={gauge} height={130} />
      <SectionLeitura>
        Executou {saldo.pctExecutado.toFixed(1)}% do caixa com {PCT_CAMPANHA_DECORRIDA}% da
        campanha decorrida — {ritmo}.
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o ritmo e quando o caixa acaba</div>
    </FlashCard>
  );
}

function CaixaHeroBack({ gastos }: { gastos: GastosState }) {
  const { execucao } = gastos;
  const option = useMemo(
    () =>
      financeLinesOption({
        labels: execucao.labels,
        planejado: execucao.planejado,
        realizado: execucao.realizado,
        projecao: execucao.projecao,
      }),
    [execucao],
  );
  const ultProjecao = execucao.projecao[execucao.projecao.length - 1] ?? 0;
  const ultPlanejado = execucao.planejado[execucao.planejado.length - 1] ?? 0;
  const ultRealizado = execucao.realizado[execucao.realizado.length - 1] ?? 0;
  const fura = ultProjecao > ultPlanejado;

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Ritmo do caixa</span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={210} />
      </div>
      <SectionLeitura>
        No ritmo atual ({fmtRS(ultRealizado)} realizados), a projeção{" "}
        {fura ? "fura o teto" : "fecha abaixo do teto"} na última semana ({fmtRS(ultProjecao)} vs{" "}
        {fmtRS(ultPlanejado)} planejados) — {fura ? "freie o gasto para o caixa chegar à urna" : "há fôlego de caixa para a reta final"}.
      </SectionLeitura>
    </div>
  );
}

function CaixaHero({ gastos }: { gastos: GastosState }) {
  return (
    <FlipCard
      front={<CaixaHeroFront gastos={gastos} />}
      back={<CaixaHeroBack gastos={gastos} />}
    />
  );
}

/* ② EXECUÇÃO SEMANAL — planejado × realizado × projeção */
function ExecucaoSemanal({ gastos }: { gastos: GastosState }) {
  const { execucao } = gastos;
  const option = useMemo(
    () =>
      financeLinesOption({
        labels: execucao.labels,
        planejado: execucao.planejado,
        realizado: execucao.realizado,
        projecao: execucao.projecao,
      }),
    [execucao],
  );
  const ultProjecao = execucao.projecao[execucao.projecao.length - 1] ?? 0;
  const ultPlanejado = execucao.planejado[execucao.planejado.length - 1] ?? 0;
  const fura = ultProjecao > ultPlanejado;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Execução semanal</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <LazyChart option={option} height={190} />
      <SectionLeitura>
        Projeção {fura ? "fura o teto" : "fecha abaixo do teto"} na última semana (
        {fmtRS(ultProjecao)} vs {fmtRS(ultPlanejado)} planejados).
      </SectionLeitura>
    </div>
  );
}

/* ③ BURN RATE — velocidade do gasto semana a semana */
const TENDENCIA_META: Record<
  GastosState["burnRate"]["tendencia"],
  { label: string; pill: string; leitura: string }
> = {
  acelerando: {
    label: "▲ acelerando",
    pill: "m-pill vermelho",
    leitura: "Gasto acelerando acima da média — sem freio, o caixa acaba antes da urna.",
  },
  estavel: {
    label: "estável",
    pill: "m-pill",
    leitura: "Gasto estável e previsível — caixa sob controle até o fim da campanha.",
  },
  desacelerando: {
    label: "▼ desacelerando",
    pill: "m-pill up",
    leitura: "Gasto desacelerando — sobra fôlego de caixa para a reta final.",
  },
};

function BurnRate({ gastos }: { gastos: GastosState }) {
  const { burnRate } = gastos;
  const meta = TENDENCIA_META[burnRate.tendencia];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Burn rate</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <StatPill label="semana atual" value={burnRate.semanaAtual} suffix=" mil/sem" />
        <StatPill label="média semanal" value={burnRate.mediaSemanal} suffix=" mil/sem" />
        <span className={meta.pill}>{meta.label}</span>
      </div>
      <SectionLeitura>{meta.leitura}</SectionLeitura>
    </div>
  );
}

/* ④ DE ONDE VEM O DINHEIRO. FRENTE: donut + lista por fonte. VERSO (toque):
   donut por valor (R$) de cada fonte — quanto cada origem pesa no caixa. */
function FontesFront({ gastos }: { gastos: GastosState }) {
  const { fontes } = gastos;
  const option = useMemo(
    () =>
      donutOption({
        items: fontes.map((f) => ({ nome: f.nome, valor: f.valor, cor: f.cor })),
        centro: fontes[0]
          ? { valor: `${fontes[0].pct}%`, label: fontes[0].nome }
          : undefined,
      }),
    [fontes],
  );
  const fundo = fontes.find((f) => /fundo/i.test(f.nome)) ?? fontes[0];
  const doacoes = fontes.find((f) => /doa/i.test(f.nome));

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">De onde vem o dinheiro</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <LazyChart option={option} height={170} />
      <div>
        {fontes.map((f) => (
          <div className="m-row" key={f.nome}>
            <span style={{ fontSize: 12 }}>{f.nome}</span>
            <span className="m-mono m-muted-c" style={{ fontSize: 11 }}>
              {fmtRS(f.valor)} ({f.pct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Campanha depende {fundo ? `${fundo.pct.toFixed(0)}% de ${fundo.nome.toLowerCase()}` : "de fundo público"}
        {doacoes ? ` — doações são só ${doacoes.pct.toFixed(0)}%.` : "."}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o peso em R$ de cada fonte</div>
    </div>
  );
}

function FontesBack({ gastos }: { gastos: GastosState }) {
  const { fontes } = gastos;
  const ord = useMemo(() => [...fontes].sort((a, b) => b.valor - a.valor), [fontes]);
  const option = useMemo(
    () =>
      donutOption({
        items: ord.map((f) => ({ nome: f.nome, valor: f.valor, cor: f.cor })),
        centro: ord[0] ? { valor: fmtRS(ord[0].valor), label: ord[0].nome } : undefined,
      }),
    [ord],
  );
  const maior = ord[0];
  const menor = ord[ord.length - 1];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Quanto cada fonte traz</span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        {maior
          ? `${maior.nome} é a maior origem (${fmtRS(maior.valor)})${menor && menor !== maior ? `, contra só ${fmtRS(menor.valor)} de ${menor.nome.toLowerCase()}` : ""} — concentração de risco se essa fonte secar.`
          : "Sem fontes registradas até aqui."}
      </SectionLeitura>
    </div>
  );
}

function Fontes({ gastos }: { gastos: GastosState }) {
  return (
    <FlipCard front={<FontesFront gastos={gastos} />} back={<FontesBack gastos={gastos} />} />
  );
}

/* ⑤ ORÇADO × GASTO POR RUBRICA. FRENTE: bullet bars com cor por status.
   VERSO (toque): barras agrupadas orçado × gasto por rubrica — qual está mais
   perto do estouro. */
function RubricasFront({ gastos }: { gastos: GastosState }) {
  const { rubricas } = gastos;
  const option = useMemo(
    () =>
      bulletBarsOption({
        items: rubricas.map((r) => ({
          nome: r.nome,
          atual: r.gasto,
          meta: r.orcado,
          cor: r.status === "estouro" ? "#EA3943" : r.status === "atencao" ? "#F5A623" : "#16C784",
        })),
      }),
    [rubricas],
  );
  const estourada = rubricas.find((r) => r.status === "estouro");

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Orçado × gasto por rubrica</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={240} />
      </div>
      <SectionLeitura>
        Barra cinza = orçado, colorida = gasto.{" "}
        {estourada
          ? `${estourada.nome} estourou o orçamento (${estourada.pct.toFixed(0)}% do orçado) — remanejar agora.`
          : "Nenhuma rubrica estourada até aqui."}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para comparar orçado × gasto rubrica a rubrica</div>
    </div>
  );
}

function RubricasBack({ gastos }: { gastos: GastosState }) {
  const { rubricas } = gastos;
  const ord = useMemo(() => [...rubricas].sort((a, b) => b.pct - a.pct), [rubricas]);
  const option = useMemo(
    () =>
      groupedBarsOption({
        labels: ord.map((r) => r.nome),
        series: [
          { nome: "orçado", cor: "#3b82f6", data: ord.map((r) => r.orcado) },
          { nome: "gasto", cor: "#16C784", data: ord.map((r) => r.gasto) },
        ],
        horizontal: true,
        suffix: "",
      }),
    [ord],
  );
  const critica = ord[0];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Orçado × gasto · proximidade do teto</span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={Math.max(200, ord.length * 34 + 56)} />
      </div>
      <SectionLeitura>
        {critica
          ? `${critica.nome} é a rubrica mais perto do teto (${critica.pct.toFixed(0)}% do orçado) — ${critica.pct >= 100 ? "já estourou, remaneje hoje" : "vigie antes que estoure"}.`
          : "Sem rubricas para comparar até aqui."}
      </SectionLeitura>
    </div>
  );
}

function Rubricas({ gastos }: { gastos: GastosState }) {
  return (
    <FlipCard front={<RubricasFront gastos={gastos} />} back={<RubricasBack gastos={gastos} />} />
  );
}

/* ⑥ CUSTO POR VOTO — atual × projetado × benchmark */
function CustoPorVoto({ gastos }: { gastos: GastosState }) {
  const { custoPorVoto } = gastos;
  const acima = custoPorVoto.atual > custoPorVoto.benchmark;
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Custo por voto</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <StatPill
          label="atual (R$/voto)"
          value={custoPorVoto.atual}
          decimals={1}
          tone={acima ? "down" : "up"}
        />
        <StatPill label="projetado (R$/voto)" value={custoPorVoto.projetado} decimals={1} />
        <StatPill label="benchmark (R$/voto)" value={custoPorVoto.benchmark} decimals={1} />
      </div>
      <SectionLeitura>
        R$ {custoPorVoto.projetado.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        /voto projetado vs benchmark R${" "}
        {custoPorVoto.benchmark.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} —
        mídia {acima ? "mal segmentada, rever alocação" : "bem segmentada"}.
      </SectionLeitura>
    </div>
  );
}

/* ⑦ ALERTAS DE ESTOURO — feed de rubricas em risco */
function AlertasEstouro({ gastos }: { gastos: GastosState }) {
  const { alertas } = gastos;
  const temVermelho = alertas.some((a) => a.nivel === "vermelho");
  return (
    <div className="m-card" role={temVermelho ? "alert" : undefined}>
      <div className="m-card-head">
        <span className="m-card-title">Alertas de estouro</span>
        <LiveBadge ch="gastos" cadenceMs={15000} />
      </div>
      {alertas.length === 0 ? (
        <div className="m-ghost">orçamento sob controle</div>
      ) : (
        <div>
          {alertas.map((a) => (
            <div className="m-feed-item" key={`${a.rubrica}-${a.msg}`}>
              <span className={`m-pill ${a.nivel}`}>{a.rubrica}</span>{" "}
              <span style={{ fontSize: 12 }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}
      <SectionLeitura>
        {alertas.length === 0
          ? "Nenhuma rubrica em risco — siga o planejado."
          : temVermelho
            ? "Há estouro em vermelho — decisão de remanejamento hoje."
            : "Alertas amarelos: rubricas perto do teto, monitorar semana a semana."}
      </SectionLeitura>
    </div>
  );
}

export default function GastosTab() {
  const gastos = useLiveChannel<GastosState>("gastos").data;
  if (!gastos || !("saldo" in gastos)) {
    return <div className="m-ghost">sincronizando…</div>;
  }

  const resumoAlertas =
    gastos.alertas.length === 0
      ? "sem alertas"
      : gastos.alertas.map((a) => `${a.rubrica}:${a.nivel}`).join(", ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <CaixaHero gastos={gastos} />
      <ExecucaoSemanal gastos={gastos} />
      <BurnRate gastos={gastos} />
      <Fontes gastos={gastos} />
      <Rubricas gastos={gastos} />
      <CustoPorVoto gastos={gastos} />
      <AlertasEstouro gastos={gastos} />
      <MOraculo section="m-gastos" context={`alertas=${resumoAlertas}`} />
    </div>
  );
}
