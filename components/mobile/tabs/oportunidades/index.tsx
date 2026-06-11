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
  scatterAvatarOption,
} from "@/components/mobile/m-chart-options";
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
function OndeAtacar({ regiao }: { regiao: OportunidadeRegiao }) {
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
    </div>
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
function RankingTemas({ regiao }: { regiao: OportunidadeRegiao }) {
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
      <div data-no-swipe>
        <LazyChart option={option} height={200} />
      </div>
      <SectionLeitura>
        {top
          ? `${top.tema} é o tema nº 1 da região (índice ${Math.round(top.oportunidade)}) — priorize na agenda e nos posts.`
          : "Sem temas ranqueados nesta região."}
      </SectionLeitura>
    </div>
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
function Municao({ municao }: { municao: OportunidadesState["municao"] }) {
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
    </div>
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
