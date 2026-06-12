"use client";

// Aba OPORTUNIDADES — o mapa de ataque por região: onde o adversário está
// exposto, qual tema tem demanda alta e satisfação baixa (ouro eleitoral),
// as manchetes que sustentam o discurso e a munição contra o governo.
// Todo card tem linha de leitura ("o que isso diz").

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  avatarRacingOption,
  bulletBarsOption,
  groupedBarsOption,
  racingBarOption,
  scatterAvatarOption,
} from "@/components/mobile/m-chart-options";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { LazyChart } from "@/components/mobile/ui/lazy-chart";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MAvatar, avatarForChart } from "@/components/mobile/ui/m-avatar";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import type { OportunidadeRegiao, OportunidadesState } from "@/lib/live-schemas";

// Cor da barra no ranking de temas conforme o índice de oportunidade.
function corOportunidade(oportunidade: number): string {
  if (oportunidade > 55) return "#16C784";
  if (oportunidade > 35) return "#F5A623";
  return "#3b82f6";
}

/* ① SELETOR DE REGIÃO — pills roláveis, uma por região */
function SeletorRegiao({
  regioes,
  regiaoSel,
  onSelect,
}: {
  regioes: OportunidadeRegiao[];
  regiaoSel: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Oportunidades por região</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div
        data-no-swipe
        style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 2 }}
      >
        {regioes.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`m-pill ${regiaoSel === r.id ? "up" : ""}`.trim()}
            onClick={() => onSelect(r.id)}
            aria-pressed={regiaoSel === r.id}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {r.nome}
          </button>
        ))}
      </div>
      <SectionLeitura>
        Toque numa região para carregar o plano de ataque local: força, fraquezas
        dos adversários, matriz de temas e discurso pronto.
      </SectionLeitura>
    </div>
  );
}

/* ② ONDE ATACAR — seu ponto forte × fraquezas dos adversários na região */
function OndeAtacarFront({ regiao }: { regiao: OportunidadeRegiao }) {
  const alvo = regiao.fraquezas[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Onde atacar · {regiao.nome}</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div
        style={{
          border: "1px solid rgba(22,199,132,0.4)",
          background: "rgba(22,199,132,0.08)",
          borderRadius: 8,
          padding: "8px 10px",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div className="m-mono m-up-c" style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6 }}>
            SEU PONTO FORTE
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{regiao.forca.tema}</div>
        </div>
        <StatPill label="score" value={regiao.forca.score} tone="up" />
      </div>
      <div>
        {regiao.fraquezas.map((f) => (
          <div className="m-feed-item" key={`${f.adversario.simbolo}-${f.tema}`}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MAvatar
                src={f.adversario.foto}
                nome={f.adversario.nome}
                cor={f.adversario.cor}
                size={26}
              />
              <span className="m-feed-title" style={{ flex: 1 }}>
                {f.adversario.nome} · {f.tema}
              </span>
              <span className="m-pill vermelho">severidade {f.severidade}</span>
            </div>
            <div className="m-feed-meta">{f.evidencia}</div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Em {regiao.nome}, bata em {alvo?.tema ?? regiao.forca.tema}:{" "}
        {alvo ? `${alvo.adversario.nome} está exposto` : "nenhum adversário exposto agora"}.
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver a matriz de temas (demanda × satisfação)</div>
    </div>
  );
}

/* VERSO ② — temas posicionados por demanda vs. satisfação: a folga (demanda −
   satisfação) é a oportunidade de ataque. */
function OndeAtacarBack({ regiao }: { regiao: OportunidadeRegiao }) {
  const ordenado = useMemo(
    () => [...regiao.matriz].sort((a, b) => b.oportunidade - a.oportunidade),
    [regiao.matriz],
  );
  const option = useMemo(
    () =>
      groupedBarsOption({
        labels: ordenado.map((m) => m.tema),
        series: [
          {
            nome: "demanda",
            cor: "#16C784",
            data: ordenado.map((m) => Math.round(m.demanda)),
          },
          {
            nome: "satisfação",
            cor: "#3b82f6",
            data: ordenado.map((m) => Math.round(m.satisfacao)),
          },
        ],
        horizontal: true,
      }),
    [ordenado],
  );
  const alvo = ordenado[0];
  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Demanda × satisfação · {regiao.nome}</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={210} />
      </div>
      <SectionLeitura>
        {alvo
          ? `Maior folga: ${alvo.tema} — demanda ${Math.round(alvo.demanda)} contra satisfação ${Math.round(alvo.satisfacao)}. Aí mora a oportunidade.`
          : "Sem temas mapeados nesta região."}
      </SectionLeitura>
    </div>
  );
}

function OndeAtacar({ regiao }: { regiao: OportunidadeRegiao }) {
  return (
    <FlipCard
      front={<OndeAtacarFront regiao={regiao} />}
      back={<OndeAtacarBack regiao={regiao} />}
    />
  );
}

/* ③ MATRIZ DA REGIÃO — demanda × satisfação, ouro no canto superior-esquerdo */
function MatrizRegiao({ regiao }: { regiao: OportunidadeRegiao }) {
  const melhor = useMemo(
    () =>
      regiao.matriz.reduce(
        (acc, m) => (m.oportunidade > acc.oportunidade ? m : acc),
        regiao.matriz[0],
      ),
    [regiao.matriz],
  );

  const option = useMemo(
    () =>
      scatterAvatarOption({
        pontos: regiao.matriz.map((m) => {
          const cor = m.tema === melhor?.tema ? "#16C784" : "#3b82f6";
          return {
            x: m.satisfacao,
            y: m.demanda,
            nome: m.tema,
            cor,
            img: avatarForChart(null, m.tema, cor),
            destaque: m.tema === melhor?.tema,
          };
        }),
        xLabel: "satisfação atual",
        yLabel: "demanda popular",
        quadrante: { x: 50, y: 50 },
      }),
    [regiao.matriz, melhor],
  );

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Matriz da região · demanda × satisfação</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div data-no-swipe>
        <LazyChart option={option} height={210} />
      </div>
      <SectionLeitura>
        Canto superior-esquerdo = ouro: alta demanda, baixa satisfação. Tema-alvo:{" "}
        {melhor?.tema ?? "—"}.
      </SectionLeitura>
    </div>
  );
}

/* ④ RANKING DE TEMAS — índice de oportunidade de 0 a 100 */
function RankingTemasFront({ regiao }: { regiao: OportunidadeRegiao }) {
  const ordenado = useMemo(
    () => [...regiao.matriz].sort((a, b) => b.oportunidade - a.oportunidade),
    [regiao.matriz],
  );
  const option = useMemo(
    () =>
      bulletBarsOption({
        items: regiao.matriz.map((m) => ({
          nome: m.tema,
          atual: m.oportunidade,
          meta: 100,
          cor: corOportunidade(m.oportunidade),
        })),
      }),
    [regiao.matriz],
  );
  const top = ordenado[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Ranking de temas</span>
        <span className="m-pill">índice de oportunidade 0–100</span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <LazyChart option={option} height={200} />
      </div>
      <SectionLeitura>
        {top
          ? `${top.tema} é o tema nº 1 da região (índice ${Math.round(top.oportunidade)}) — priorize na agenda e nos posts.`
          : "Sem temas ranqueados nesta região."}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver a corrida do índice de oportunidade</div>
    </div>
  );
}

/* VERSO ④ — corrida animada dos temas pelo índice de oportunidade: onde focar. */
function RankingTemasBack({ regiao }: { regiao: OportunidadeRegiao }) {
  const ordenado = useMemo(
    () => [...regiao.matriz].sort((a, b) => b.oportunidade - a.oportunidade),
    [regiao.matriz],
  );
  const option = useMemo(
    () =>
      racingBarOption({
        items: ordenado.map((m) => ({
          nome: m.tema,
          valor: Math.round(m.oportunidade),
          cor: corOportunidade(m.oportunidade),
        })),
        max: 100,
      }),
    [ordenado],
  );
  const top = ordenado[0];
  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Onde focar · corrida de temas</span>
        <span className="m-pill">índice 0–100</span>
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={200} />
      </div>
      <SectionLeitura>
        {top
          ? `${top.tema} lidera a corrida (índice ${Math.round(top.oportunidade)}). Concentre tempo, verba e palanque aí.`
          : "Sem temas ranqueados nesta região."}
      </SectionLeitura>
    </div>
  );
}

function RankingTemas({ regiao }: { regiao: OportunidadeRegiao }) {
  return (
    <FlipCard
      front={<RankingTemasFront regiao={regiao} />}
      back={<RankingTemasBack regiao={regiao} />}
    />
  );
}

/* ⑤ MANCHETES — prova social do discurso */
function Manchetes({ regiao }: { regiao: OportunidadeRegiao }) {
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Manchetes que sustentam o discurso</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div>
        {regiao.noticias.map((n) => (
          <div className="m-feed-item" key={n.titulo}>
            <div className="m-feed-title">{n.titulo}</div>
            <div className="m-feed-meta">
              {n.veiculo} · <span className="m-pill">{n.tema}</span>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Use a manchete como prova social ao bater no tema.
      </SectionLeitura>
    </div>
  );
}

/* ⑥ DISCURSO RECOMENDADO — pronto para copiar e usar no palanque */
function DiscursoRecomendado({ regiao }: { regiao: OportunidadeRegiao }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = () => {
    navigator.clipboard
      .writeText(regiao.discurso.texto)
      .then(() => {
        setCopiado(true);
        window.setTimeout(() => setCopiado(false), 2000);
      })
      .catch(() => {
        // Clipboard indisponível (http/permissão) — segue sem feedback.
      });
  };

  return (
    <div className="m-card" style={{ borderColor: "var(--m-warn)" }}>
      <div className="m-card-head">
        <span className="m-card-title">Discurso recomendado</span>
        <span className="m-pill amarelo">{regiao.discurso.tema}</span>
      </div>
      <p style={{ fontStyle: "italic", fontSize: 13, lineHeight: 1.5, margin: "4px 0 10px" }}>
        “{regiao.discurso.texto}”
      </p>
      <button type="button" className="m-btn primary" onClick={copiar}>
        {copiado ? "Copiado ✓" : "Copiar discurso"}
      </button>
      <SectionLeitura>
        Texto calibrado para {regiao.nome}: abre pelo tema de maior oportunidade e
        cita a dor local — copie e adapte ao palanque.
      </SectionLeitura>
    </div>
  );
}

/* ⑦ MUNIÇÃO — matérias negativas sobre o governo, por alcance */
function MunicaoFront({ municao }: { municao: OportunidadesState["municao"] }) {
  const top5 = municao.slice(0, 5);
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Munição contra o governo</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div>
        {top5.map((m) => (
          <div className="m-feed-item" key={m.titulo}>
            <div className="m-feed-title">{m.titulo}</div>
            <div className="m-feed-meta">
              {m.veiculo} · alcance{" "}
              <span className="m-mono">{Math.round(m.alcance)}k</span> ·{" "}
              <span className="m-pill">{m.tema}</span>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Matérias negativas sobre o governo nas últimas 24h, ranqueadas por alcance.
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o alcance somado por tema</div>
    </div>
  );
}

/* VERSO ⑦ — alcance total da munição agregado por tema: qual frente bate mais. */
function MunicaoBack({ municao }: { municao: OportunidadesState["municao"] }) {
  const porTema = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const m of municao) {
      mapa.set(m.tema, (mapa.get(m.tema) ?? 0) + m.alcance);
    }
    return [...mapa.entries()]
      .map(([tema, alcance]) => ({ tema, alcance: Math.round(alcance) }))
      .sort((a, b) => b.alcance - a.alcance);
  }, [municao]);

  const option = useMemo(
    () =>
      groupedBarsOption({
        labels: porTema.map((t) => t.tema),
        series: [{ nome: "alcance (k)", cor: "#EA3943", data: porTema.map((t) => t.alcance) }],
        horizontal: true,
        suffix: "k",
      }),
    [porTema],
  );
  const lider = porTema[0];
  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Alcance da munição por tema</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={210} />
      </div>
      <SectionLeitura>
        {lider
          ? `"${lider.tema}" é a frente de maior alcance somado (${lider.alcance}k). Concentre o ataque onde a indignação já circula.`
          : "Sem munição catalogada agora."}
      </SectionLeitura>
    </div>
  );
}

function Municao({ municao }: { municao: OportunidadesState["municao"] }) {
  return (
    <FlipCard
      front={<MunicaoFront municao={municao} />}
      back={<MunicaoBack municao={municao} />}
    />
  );
}

/* ⑧ VISÃO GERAL — melhor tema por região no estado inteiro */
function VisaoGeral({ topGeral }: { topGeral: OportunidadesState["topGeral"] }) {
  const option = useMemo(
    () =>
      avatarRacingOption({
        items: topGeral.slice(0, 8).map((t) => ({
          nome: `${t.regiao} · ${t.tema}`,
          valor: t.indice,
          cor: "#16C784",
          img: avatarForChart(null, t.regiao, "#16C784"),
        })),
      }),
    [topGeral],
  );
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Visão geral · melhor tema por região</span>
        <LiveBadge ch="oportunidades" cadenceMs={30000} />
      </div>
      <div data-no-swipe>
        <EChart option={option} height={220} />
      </div>
      <SectionLeitura>
        Onde o discurso certo rende mais votos no estado inteiro.
      </SectionLeitura>
    </div>
  );
}

export default function OportunidadesTab() {
  const data = useLiveChannel<OportunidadesState>("oportunidades").data;
  const [regiaoSel, setRegiaoSel] = useState<string>("costa-verde");

  if (!data || !("regioes" in data)) {
    return <div className="m-ghost">sincronizando oportunidades…</div>;
  }

  const regiao = data.regioes.find((r) => r.id === regiaoSel) ?? data.regioes[0];
  if (!regiao) {
    return <div className="m-ghost">sincronizando oportunidades…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <SeletorRegiao
        regioes={data.regioes}
        regiaoSel={regiao.id}
        onSelect={setRegiaoSel}
      />
      <OndeAtacar regiao={regiao} />
      <MatrizRegiao regiao={regiao} />
      <RankingTemas regiao={regiao} />
      <Manchetes regiao={regiao} />
      <DiscursoRecomendado regiao={regiao} />
      <Municao municao={data.municao} />
      <VisaoGeral topGeral={data.topGeral} />
      <MOraculo section="m-oportunidades" context={`região ${regiaoSel}`} />
    </div>
  );
}
