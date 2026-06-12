"use client";

// Aba REDES — A VITRINE do cockpit: cada rede social como um ativo, com
// histórico, arena comparativa com as cabeças dos candidatos, melhor horário
// e share-of-voice dos veículos. TODO card tem número-destaque, legenda e
// linha de leitura ("o que isso diz").

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  areaStackOption,
  avatarRacingOption,
  compareLinesOption,
  donutOption,
  groupedBarsOption,
  heatmapHorasOption,
  scatterAvatarOption,
} from "@/components/mobile/m-chart-options";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { LazyChart } from "@/components/mobile/ui/lazy-chart";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MAvatar, avatarForChart } from "@/components/mobile/ui/m-avatar";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import { getAvatar } from "@/lib/avatars";
import type { RedeHist, RedeId, RedesV2Snapshot } from "@/lib/live-schemas";

const REDE_META: Record<RedeId, { nome: string; cor: string; sigla: string }> = {
  instagram: { nome: "Instagram", cor: "#E1306C", sigla: "IG" },
  facebook: { nome: "Facebook", cor: "#1877F2", sigla: "FB" },
  x: { nome: "X (Twitter)", cor: "#d6dbe2", sigla: "X" },
  youtube: { nome: "YouTube", cor: "#FF4444", sigla: "YT" },
  tiktok: { nome: "TikTok", cor: "#69C9D0", sigla: "TT" },
};

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const HORAS = ["8h", "10h", "12h", "14h", "17h", "19h", "20h", "21h"];

function fmtK(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1)}k` : String(Math.round(v));
}

/* ① HERO POR REDE — cada rede como um ativo, com 30 dias de filme */
// FRENTE: número-destaque + spark de seguidores. VERSO (toque): filme dos 30
// dias com seguidores E engajamento empilhados (areaStack), com um boneco para
// dar rosto ao público da rede.
function RedeHeroFront({ rede }: { rede: RedeHist }) {
  const meta = REDE_META[rede.rede];
  const ganho30d = rede.seguidoresAgora - (rede.seguidores30d[0]?.v ?? rede.seguidoresAgora);
  const pct30d = ((ganho30d / Math.max(1, rede.seguidores30d[0]?.v ?? 1)) * 100).toFixed(1);
  const engDir =
    rede.engajamentoAgora >= (rede.engajamento30d[0]?.v ?? 0) ? "subindo" : "caindo";

  const option = useMemo(
    () =>
      areaStackOption({
        labels: rede.seguidores30d.map((p) => {
          const d = new Date(p.t);
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        }),
        series: [
          { nome: "Seguidores", cor: meta.cor, data: rede.seguidores30d.map((p) => p.v), area: true },
        ],
      }),
    [rede, meta.cor],
  );

  return (
    <article
      className="m-quote-card"
      style={{ width: "100%", minHeight: 250, borderTop: `2px solid ${meta.cor}` }}
    >
      <div className="m-quote-head">
        <span className="m-quote-sym" style={{ color: meta.cor }}>
          {meta.sigla} · {meta.nome}
        </span>
        <span className={`m-pill ${ganho30d >= 0 ? "up" : "down"}`}>
          {ganho30d >= 0 ? "▲" : "▼"} {pct30d}% / 30d
        </span>
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "baseline", margin: "6px 0" }}>
        <span className="m-quote-val" style={{ fontSize: 21 }}>
          <Odometer value={rede.seguidoresAgora} />
        </span>
        <span className="m-mono m-muted-c" style={{ fontSize: 10.5 }}>
          seguidores
        </span>
        <span className="m-mono m-warn-c" style={{ fontSize: 12, fontWeight: 700 }}>
          eng <Odometer value={rede.engajamentoAgora} decimals={1} suffix="%" />
        </span>
      </div>
      <LazyChart option={option} height={120} />
      <SectionLeitura>
        {meta.nome} {ganho30d >= 0 ? "ganhou" : "perdeu"} {fmtK(Math.abs(ganho30d))} seguidores
        em 30 dias; engajamento {engDir}.
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver os 30 dias (seguidores + engajamento)</div>
    </article>
  );
}

function RedeHeroBack({ rede }: { rede: RedeHist }) {
  const meta = REDE_META[rede.rede];
  const ganhoEng = rede.engajamentoAgora - (rede.engajamento30d[0]?.v ?? rede.engajamentoAgora);

  // Filme dos 30 dias: seguidores (área da cor da rede) + engajamento % (eixo direito amarelo).
  const option = useMemo(
    () =>
      areaStackOption({
        labels: rede.seguidores30d.map((p) => {
          const d = new Date(p.t);
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        }),
        series: [
          { nome: "Seguidores", cor: meta.cor, data: rede.seguidores30d.map((p) => p.v), area: true },
        ],
        series2: {
          nome: "Engajamento %",
          cor: "#F5A623",
          data: rede.engajamento30d.map((p) => p.v),
        },
      }),
    [rede, meta.cor],
  );

  return (
    <article
      className="m-quote-card"
      style={{ width: "100%", height: "100%", overflowY: "auto", borderTop: `2px solid ${meta.cor}` }}
    >
      <div className="m-quote-head" style={{ alignItems: "center", gap: 6 }}>
        <MAvatar src={getAvatar("eleitor")} nome="Rede" cor="#16C784" size={24} />
        <span className="m-quote-sym" style={{ color: meta.cor }}>
          {meta.sigla} · 30 dias
        </span>
        <span className={`m-pill ${ganhoEng >= 0 ? "up" : "down"}`}>
          eng {ganhoEng >= 0 ? "▲" : "▼"} {Math.abs(ganhoEng).toFixed(1)}pp
        </span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={150} />
      </div>
      <SectionLeitura>
        {ganhoEng >= 0
          ? `Engajamento e base sobem juntos no ${meta.nome} — mantenha o formato que está funcionando.`
          : `Base cresce mas engajamento cai no ${meta.nome} — reveja o conteúdo, não só a frequência.`}
      </SectionLeitura>
    </article>
  );
}

function RedeHeroCard({ rede }: { rede: RedeHist }) {
  // O FlipCard precisa de uma caixa com largura fixa e scroll-snap dentro do
  // carrossel (o verso é position:absolute e herda a altura do front).
  return (
    <div style={{ flex: "0 0 300px", scrollSnapAlign: "start", minHeight: 250 }}>
      <FlipCard front={<RedeHeroFront rede={rede} />} back={<RedeHeroBack rede={rede} />} />
    </div>
  );
}

function RedesHero({ redes }: { redes: RedesV2Snapshot }) {
  const lider = [...redes.porRede].sort(
    (a, b) =>
      b.seguidoresAgora / Math.max(1, b.seguidores30d[0]?.v ?? 1) -
      a.seguidoresAgora / Math.max(1, a.seguidores30d[0]?.v ?? 1),
  )[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Suas redes · filme de 30 dias</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div className="m-carousel" data-no-swipe>
        {redes.porRede.map((r) => (
          <RedeHeroCard key={r.rede} rede={r} />
        ))}
      </div>
      <SectionLeitura>
        Arraste para o lado: cada card é uma rede. A que mais cresce agora é{" "}
        {REDE_META[lider.rede].nome}.
      </SectionLeitura>
    </div>
  );
}

/* ② ARENA POR REDE — SOST × 5 concorrentes, com as cabeças no gráfico */
const METRICAS = [
  { id: "seguidores", label: "Seguidores", suffix: "" },
  { id: "engajamento", label: "Engajamento", suffix: "%" },
  { id: "crescimento7d", label: "Crescimento 7d", suffix: "%" },
] as const;

// FRENTE: racing dos concorrentes na rede e métrica escolhidas. VERSO (toque):
// mapa de posicionamento (scatter) com as CABEÇAS — x = seguidores, y =
// engajamento — para enxergar quem é grande mas pouco engajado e vice-versa.
function ArenaFront({
  redes,
  redeSel,
  setRedeSel,
  metrica,
  setMetrica,
}: {
  redes: RedesV2Snapshot;
  redeSel: RedeId;
  setRedeSel: (r: RedeId) => void;
  metrica: (typeof METRICAS)[number]["id"];
  setMetrica: (m: (typeof METRICAS)[number]["id"]) => void;
}) {
  const dados = redes.porRede.find((r) => r.rede === redeSel);
  const option = useMemo(() => {
    if (!dados) return null;
    const m = METRICAS.find((x) => x.id === metrica)!;
    return avatarRacingOption({
      items: dados.concorrentes.map((c) => ({
        nome: c.nome.split(" ").slice(0, 2).join(" "),
        valor: metrica === "seguidores" ? c.seguidores : c[metrica],
        cor: c.cor,
        img: avatarForChart(c.foto, c.nome, c.cor),
      })),
      suffix: m.suffix,
    });
  }, [dados, metrica]);

  if (!dados || !option) return null;
  const ordenado = [...dados.concorrentes].sort((a, b) =>
    metrica === "seguidores" ? b.seguidores - a.seguidores : b[metrica] - a[metrica],
  );
  const posSost = ordenado.findIndex((c) => c.simbolo === "SOST") + 1;
  const gap = ordenado[0]?.simbolo === "SOST"
    ? "na liderança"
    : `gap de ${metrica === "seguidores" ? fmtK(ordenado[0].seguidores - (ordenado.find((c) => c.simbolo === "SOST")?.seguidores ?? 0)) : `${(ordenado[0][metrica] - (ordenado.find((c) => c.simbolo === "SOST")?.[metrica] ?? 0)).toFixed(1)}${METRICAS.find((x) => x.id === metrica)!.suffix}`} para o líder`;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Arena · você × concorrentes por rede</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
        {redes.porRede.map((r) => (
          <button
            key={r.rede}
            type="button"
            className={`m-pill ${redeSel === r.rede ? "up" : ""}`.trim()}
            onClick={() => setRedeSel(r.rede)}
            aria-pressed={redeSel === r.rede}
            style={redeSel === r.rede ? { color: REDE_META[r.rede].cor, borderColor: REDE_META[r.rede].cor } : undefined}
          >
            {REDE_META[r.rede].sigla}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {METRICAS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`m-pill ${metrica === m.id ? "amarelo" : ""}`.trim()}
            onClick={() => setMetrica(m.id)}
            aria-pressed={metrica === m.id}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div data-no-swipe>
        <EChart option={option} height={200} />
      </div>
      <SectionLeitura>
        No {REDE_META[redeSel].nome}, você é o {posSost}º em{" "}
        {METRICAS.find((x) => x.id === metrica)!.label.toLowerCase()} — {gap}.
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o mapa tamanho × engajamento</div>
    </div>
  );
}

function ArenaBack({ redes, redeSel }: { redes: RedesV2Snapshot; redeSel: RedeId }) {
  const dados = redes.porRede.find((r) => r.rede === redeSel);

  // Posiciona cada concorrente pela cabeça: x = seguidores, y = engajamento %.
  const option = useMemo(() => {
    if (!dados) return null;
    return scatterAvatarOption({
      pontos: dados.concorrentes.map((c) => ({
        x: c.seguidores,
        y: c.engajamento,
        nome: c.nome.split(" ").slice(0, 2).join(" "),
        cor: c.cor,
        img: avatarForChart(c.foto, c.nome, c.cor),
        destaque: c.simbolo === "SOST",
      })),
      xLabel: "seguidores",
      yLabel: "engajamento %",
    });
  }, [dados]);

  if (!dados || !option) return null;
  const sost = dados.concorrentes.find((c) => c.simbolo === "SOST");
  const maisEngajado = [...dados.concorrentes].sort((a, b) => b.engajamento - a.engajamento)[0];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Mapa · tamanho × engajamento no {REDE_META[redeSel].nome}</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={200} />
      </div>
      <SectionLeitura>
        {maisEngajado?.simbolo === "SOST"
          ? "Você lidera em engajamento — base menor pode render mais por seguidor; aposte em conteúdo, não só em volume."
          : `${maisEngajado?.nome.split(" ")[0]} engaja mais por seguidor (${maisEngajado?.engajamento.toFixed(1)}%) — copie o formato dele; você está em ${sost?.engajamento.toFixed(1)}%.`}
      </SectionLeitura>
    </div>
  );
}

function Arena({ redes }: { redes: RedesV2Snapshot }) {
  const [redeSel, setRedeSel] = useState<RedeId>("instagram");
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["id"]>("seguidores");

  return (
    <FlipCard
      front={
        <ArenaFront
          redes={redes}
          redeSel={redeSel}
          setRedeSel={setRedeSel}
          metrica={metrica}
          setMetrica={setMetrica}
        />
      }
      back={<ArenaBack redes={redes} redeSel={redeSel} />}
    />
  );
}

/* ③ QUEM CRESCE MAIS — 7 dias, todos × todas as redes */
function QuemCresce({ redes }: { redes: RedesV2Snapshot }) {
  const candidatos = redes.porRede[0]?.concorrentes ?? [];
  const option = useMemo(
    () =>
      groupedBarsOption({
        labels: redes.porRede.map((r) => REDE_META[r.rede].sigla),
        series: candidatos.map((c) => ({
          nome: c.nome.split(" ")[0],
          cor: c.cor,
          data: redes.porRede.map(
            (r) => r.concorrentes.find((x) => x.simbolo === c.simbolo)?.crescimento7d ?? 0,
          ),
        })),
        suffix: "%",
      }),
    [redes.porRede, candidatos],
  );

  let melhor = { nome: "", rede: "", valor: -Infinity };
  for (const r of redes.porRede) {
    for (const c of r.concorrentes) {
      if (c.crescimento7d > melhor.valor) {
        melhor = { nome: c.nome, rede: REDE_META[r.rede].nome, valor: c.crescimento7d };
      }
    }
  }

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Quem cresce mais · 7 dias</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        {candidatos.map((c) => (
          <span key={c.simbolo} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--m-muted)" }}>
            <MAvatar src={c.foto} nome={c.nome} cor={c.cor} size={18} /> {c.nome.split(" ")[0]}
          </span>
        ))}
      </div>
      <LazyChart option={option} height={190} />
      <SectionLeitura>
        Barras acima de zero = ganhando seguidores. {melhor.nome} é quem mais cresce na semana
        ({melhor.valor.toFixed(1)}% no {melhor.rede}).
      </SectionLeitura>
    </div>
  );
}

/* ⑤ MELHOR HORÁRIO PARA POSTAR */
function MelhorHorario({ redes }: { redes: RedesV2Snapshot }) {
  const option = useMemo(
    () => heatmapHorasOption({ dias: DIAS, horas: HORAS, values: redes.heatmapPostagem }),
    [redes.heatmapPostagem],
  );
  const top = [...redes.heatmapPostagem].sort((a, b) => b[2] - a[2])[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Melhor horário para postar</span>
        <span className="m-pill">alcance por dia × hora</span>
      </div>
      <LazyChart option={option} height={180} />
      <SectionLeitura>
        Quanto mais verde, mais alcance. Pico: {DIAS[top?.[0] ?? 0]} às {HORAS[top?.[1] ?? 0]} —
        agende os posts importantes aí.
      </SectionLeitura>
    </div>
  );
}

/* ⑥ VEÍCULOS — share of voice da imprensa */
// FRENTE: donut do share atual + lista com tom. VERSO (toque): filme do share
// ao longo do tempo (compareLinesOption do spark de cada veículo) — para ver
// quem está ganhando ou perdendo espaço na cobertura.
const VEICULO_CORES = ["#16C784", "#F5A623", "#E1306C", "#1877F2", "#69C9D0", "#d6dbe2"];

function VeiculosFront({ redes }: { redes: RedesV2Snapshot }) {
  const top6 = redes.veiculos.slice(0, 6);
  const option = useMemo(
    () =>
      donutOption({
        items: top6.map((v) => ({
          nome: v.veiculo,
          valor: v.share,
          cor: v.tom > 0.15 ? "#16C784" : v.tom < -0.15 ? "#EA3943" : "#8a93a8",
        })),
        centro: { valor: `${Math.round(top6[0]?.share ?? 0)}%`, label: top6[0]?.veiculo ?? "" },
      }),
    [top6],
  );
  const lider = top6[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Imprensa · quem fala de você</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <LazyChart option={option} height={170} />
      <div>
        {top6.map((v) => (
          <div className="m-row" key={v.veiculo}>
            <span style={{ fontSize: 12 }}>{v.veiculo}</span>
            <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="m-mono m-muted-c" style={{ fontSize: 11 }}>
                {v.share.toFixed(1)}%
              </span>
              <span className={`m-pill ${v.tom > 0.15 ? "up" : v.tom < -0.15 ? "down" : ""}`.trim()}>
                {v.tom > 0.15 ? "favorável" : v.tom < -0.15 ? "crítico" : "neutro"}
              </span>
            </span>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Fatia = quanto cada veículo fala de você; cor = tom. {lider?.veiculo} concentra a
        cobertura{lider && lider.tom < -0.15 ? " com tom crítico — prioridade de assessoria." : "."}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver quem ganha ou perde espaço</div>
    </div>
  );
}

function VeiculosBack({ redes }: { redes: RedesV2Snapshot }) {
  const top6 = redes.veiculos.slice(0, 6);
  const maxLen = top6.reduce((m, v) => Math.max(m, v.spark.length), 0);

  // Share de cada veículo ao longo do tempo (normalizado: 100 = ponto inicial).
  const option = useMemo(
    () =>
      compareLinesOption({
        labels: Array.from({ length: maxLen }, (_, i) => `${i + 1}`),
        series: top6.map((v, i) => ({
          nome: v.veiculo,
          cor: VEICULO_CORES[i % VEICULO_CORES.length],
          data: v.spark,
        })),
      }),
    [top6, maxLen],
  );

  // Quem mais ganhou/perdeu share entre o início e o fim do spark.
  const variacao = top6
    .map((v) => {
      const ini = v.spark.find((x) => x !== 0) ?? v.spark[0] ?? 1;
      const fim = v.spark[v.spark.length - 1] ?? ini;
      return { veiculo: v.veiculo, delta: ((fim - ini) / Math.max(1, ini)) * 100 };
    })
    .sort((a, b) => b.delta - a.delta);
  const sobe = variacao[0];
  const cai = variacao[variacao.length - 1];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Imprensa · share ao longo do tempo</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        {sobe && cai && sobe.veiculo !== cai.veiculo
          ? `${sobe.veiculo} ganha espaço (${sobe.delta >= 0 ? "+" : ""}${sobe.delta.toFixed(0)}%) e ${cai.veiculo} recua (${cai.delta.toFixed(0)}%) — recalibre o relacionamento de assessoria.`
          : "Linhas normalizadas (100 = início): o que sobe está aumentando a cobertura sobre você."}
      </SectionLeitura>
    </div>
  );
}

function Veiculos({ redes }: { redes: RedesV2Snapshot }) {
  return <FlipCard front={<VeiculosFront redes={redes} />} back={<VeiculosBack redes={redes} />} />;
}

/* ④ monitor do último post (v1, com leitura) */
function MonitorUltimoPost({ redes }: { redes: RedesV2Snapshot }) {
  const post = redes.ultimoPost;
  const option = useMemo(() => {
    const minutos = post.bandaP25.map((_, i) => `${i}m`);
    return {
      backgroundColor: "transparent",
      animation: false,
      tooltip: {
        backgroundColor: "rgba(10,13,19,0.97)",
        borderColor: "#1e2638",
        textStyle: { color: "#e8ecf4", fontSize: 11 },
        confine: true,
        trigger: "axis" as const,
      },
      grid: { left: 6, right: 30, top: 8, bottom: 16, containLabel: true },
      xAxis: {
        type: "category" as const,
        data: minutos,
        boundaryGap: false,
        axisLabel: { color: "#8a93a8", fontSize: 9, interval: 14 },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
      },
      yAxis: {
        type: "value" as const,
        position: "right" as const,
        scale: true,
        axisLabel: { color: "#8a93a8", fontSize: 9 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
      },
      series: [
        { name: "banda p25", type: "line" as const, data: post.bandaP25, stack: "banda", showSymbol: false, lineStyle: { opacity: 0 }, silent: true, tooltip: { show: false } },
        { name: "banda média 30 posts", type: "line" as const, data: post.bandaP75.map((v, i) => v - post.bandaP25[i]), stack: "banda", showSymbol: false, lineStyle: { opacity: 0 }, areaStyle: { color: "#8a93a8", opacity: 0.14 }, silent: true, tooltip: { show: false } },
        { name: "este post", type: "line" as const, data: post.curva1h.map((p) => p.v), showSymbol: false, lineStyle: { width: 2.2, color: post.selo === "sono" ? "#EA3943" : "#16C784" }, itemStyle: { color: "#16C784" } },
      ],
    };
  }, [post]);

  const selo = post.selo === "fogo" ? "🔥 acima da banda" : post.selo === "sono" ? "💤 abaixo da banda" : "dentro da banda";

  return (
    <FlashCard watch={post.curtidas}>
      <div className="m-card-head">
        <span className="m-card-title">Monitor do último post</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <p style={{ fontSize: 12.5, margin: "0 0 8px" }}>“{post.texto}”</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <StatPill label="curtidas" value={post.curtidas} />
        <StatPill label="comentários" value={post.comentarios} />
        <StatPill label="compart." value={post.compartilhamentos} />
        <StatPill label="views" value={post.views} />
        <span className={`m-pill ${post.selo === "fogo" ? "up" : post.selo === "sono" ? "down" : ""}`.trim()}>{selo}</span>
      </div>
      <div data-no-swipe>
        <EChart option={option} height={130} />
      </div>
      <SectionLeitura>
        Linha verde = este post, minuto a minuto na 1ª hora; faixa cinza = o normal dos seus
        últimos 30 posts. {post.selo === "fogo" ? "Está performando acima do normal — impulsione agora." : post.selo === "sono" ? "Abaixo do normal — revise horário/formato." : "Performance dentro do esperado."}
      </SectionLeitura>
    </FlashCard>
  );
}

/* ⑦ racing semanal com cabeças */
function RacingSemanal({ redes }: { redes: RedesV2Snapshot }) {
  const fotos = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const r of redes.porRede) for (const c of r.concorrentes) m.set(c.nome, c.foto);
    return m;
  }, [redes.porRede]);

  const option = useMemo(
    () =>
      avatarRacingOption({
        items: redes.racingSemanal.map((r) => ({
          nome: r.nome.split(" ").slice(0, 2).join(" "),
          valor: r.engajamento7d,
          cor: r.cor,
          img: avatarForChart(fotos.get(r.nome) ?? null, r.nome, r.cor),
        })),
        suffix: "k",
      }),
    [redes.racingSemanal, fotos],
  );
  const lider = redes.racingSemanal[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Engajamento total · semana</span>
        <LiveBadge ch="redes" cadenceMs={3000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={230} />
      </div>
      <SectionLeitura>
        Soma de curtidas+comentários+compart. da semana (milhares), todas as redes.{" "}
        {lider ? `${lider.nome} lidera o tabuleiro.` : ""}
      </SectionLeitura>
    </div>
  );
}

/* ⑧ detector de crise (v1) */
function CriseDetector({ redes }: { redes: RedesV2Snapshot }) {
  const c = redes.crise;
  return (
    <div
      className="m-card"
      role={c.ativo ? "alert" : undefined}
      style={c.ativo ? { borderColor: "var(--m-down)", boxShadow: "0 0 22px -10px var(--m-down)" } : undefined}
    >
      <div className="m-card-head">
        <span className="m-card-title">Detector de crise</span>
        <span className={`m-pill ${c.ativo ? "vermelho" : "up"}`}>{c.ativo ? "CRISE EM CURSO" : "normal"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className={`m-mono ${c.ativo ? "m-down-c" : "m-up-c"}`} style={{ fontSize: 24, fontWeight: 800 }}>
          z = <Odometer value={c.zscore} decimals={2} />
        </span>
      </div>
      <SectionLeitura>
        Mede se o volume de críticas saiu do padrão histórico (limiar z &gt; 2).{" "}
        {c.ativo ? "Saiu: resposta segmentada recomendada AGORA." : "Tudo dentro do padrão."}
      </SectionLeitura>
    </div>
  );
}

export default function RedesTab() {
  const redes = useLiveChannel<RedesV2Snapshot>("redes").data;
  if (!redes || !("porRede" in redes)) {
    return <div className="m-ghost">sincronizando com as redes…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <RedesHero redes={redes} />
      <Arena redes={redes} />
      <QuemCresce redes={redes} />
      <MonitorUltimoPost redes={redes} />
      <MelhorHorario redes={redes} />
      <Veiculos redes={redes} />
      <RacingSemanal redes={redes} />
      <CriseDetector redes={redes} />
      <MOraculo section="m-redes" context={`crise=${redes.crise.ativo}`} />
    </div>
  );
}
