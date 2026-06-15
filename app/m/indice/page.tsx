"use client";

// /m/indice — explicação profunda do índice SOST-IDX: o que é, como é
// calculado (pesos vivos da watchlist), os 4 componentes com fonte de extração,
// correlação com o índice de sentimento do Brandwatch e limitações.
// Protegido pelo gate do layout; dados vivos via LiveDataProvider (SSE).

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { candlestickOption } from "@/components/mobile/m-chart-options";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import type { IdxSnapshot } from "@/lib/live-schemas";
import { FONTE_COMO } from "@/lib/mobile/fonte-meta";
import type { Watchlist } from "@/lib/watchlist";

type ComponenteKey = keyof IdxSnapshot["breakdown"];

const COMPONENTES: {
  key: ComponenteKey;
  nome: string;
  oQueMede: string;
  extracao: string;
  como: string;
}[] = [
  {
    key: "imprensa",
    nome: "Imprensa",
    oQueMede:
      "Presença do candidato no noticiário: o ritmo de matérias dos últimos dias comparado com o ritmo normal dele. Acima de 100 = em alta na imprensa.",
    extracao: "Google News RSS (gratuito, sem chave)",
    como: FONTE_COMO.imprensa,
  },
  {
    key: "sentimento",
    nome: "Sentimento",
    oQueMede:
      "Se falam bem ou mal: cada manchete real é classificada por IA em português como positiva, neutra ou negativa. Acima de 100 = clima mais favorável.",
    extracao: "pysentimiento (BERT em PT) via sidecar Python",
    como: FONTE_COMO.sentimento,
  },
  {
    key: "seguidores",
    nome: "Seguidores",
    oQueMede:
      "Tamanho da base online (soma das redes). No card é mostrado como ÍNDICE dos últimos 7 dias — a variação % da base nesse período (tendência da audiência própria).",
    extracao: "Bright Data + yt-dlp via sidecar (sem API key)",
    como: FONTE_COMO.seguidores,
  },
  {
    key: "mencoes",
    nome: "Menções",
    oQueMede:
      "Quanto procuram por ele: interesse de busca no Google nos últimos 7 dias, normalizado. Acima de 100 = buzz acima do habitual.",
    extracao: "Google Trends (pytrends) via sidecar",
    como: FONTE_COMO.mencoes,
  },
];

// Correlação Brandwatch ↔ SOST-IDX (filosofia espelhada, fontes abertas).
const BRANDWATCH_LINHAS: { brandwatch: string; sost: string }[] = [
  {
    brandwatch: "Sentiment score — % positivo − % negativo sobre menções classificadas por IA",
    sost: "Componente sentimento — pysentimiento (BERT em PT) sobre manchetes reais do Google News",
  },
  {
    brandwatch: "Mention volume — volume de menções à marca nas redes e na web",
    sost: "Componente menções — interesse de busca no Google Trends (Brasil, 7 dias)",
  },
  {
    brandwatch: "Audience / reach — alcance e tamanho da audiência da marca",
    sost: "Componente seguidores — inscritos reais do canal oficial no YouTube (yt-dlp)",
  },
  {
    brandwatch: "News coverage — presença da marca na mídia editorial",
    sost: "Componente imprensa — ritmo de matérias no Google News vs o normal do candidato",
  },
];

export default function MobileIndicePage() {
  const idx = useLiveChannel<IdxSnapshot>("idx.sost").data;
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;

  const option = useMemo(
    () => (idx ? candlestickOption({ candles: [...idx.candles30d, idx.candleVivo] }) : null),
    [idx],
  );

  const simbolo = watchlist?.principal.simbolo ?? "SOST";
  const pesos = watchlist?.pesosIndice;

  const formula = pesos
    ? COMPONENTES.map((c) => `${Math.round(pesos[c.key] * 100)}% × ${c.nome.toLowerCase()}`).join("  +  ")
    : null;

  return (
    <div
      className="m-page-scroll"
      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <header
        className="m-header"
        style={{ position: "static", padding: 0, border: "none", background: "none" }}
      >
        <Link href="/m" className="m-btn" aria-label="Voltar ao cockpit">
          <ArrowLeft size={15} /> Cockpit
        </Link>
        <span className="m-header-brand">{simbolo}-IDX · COMO FUNCIONA</span>
      </header>

      {/* ── o que é ── */}
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">O que é o índice {simbolo}-IDX</span>
        </div>
        <p style={{ fontSize: 12.5, lineHeight: 1.55, margin: "2px 0 6px", color: "#cfd6e4" }}>
          É o <strong>termômetro único da imagem do candidato</strong>, no formato de uma ação na
          bolsa: um número que resume imprensa, sentimento, base online e buzz de busca.{" "}
          <strong>Subiu = candidato em alta; caiu = perdendo terreno.</strong>
        </p>
        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0, color: "var(--m-muted)" }}>
          A escala gira em torno de 100 (o “normal” do candidato), tipicamente entre ~100 e ~142.
          Cada dia vira um candle (abertura, máxima, mínima, fechamento), igual a um pregão — por
          isso o gráfico de velas no card principal.
        </p>
        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: "8px 0 0", color: "var(--m-muted)" }}>
          O card agora resume tudo em <strong>4 leituras</strong>: <strong>IRE</strong> (Índice de
          Reputação Eleitoral — falam bem ou mal, sentimento 0–100), <strong>TIRE</strong> (tendência
          do IRE do candidato nos últimos <strong>7 dias</strong>, ▲ ▬ ▼), <strong>PRA</strong>{" "}
          (Posição Relativa Adversários = 100 − Score ÷ média × 100, em %; 0 = média do páreo,
          negativo = à frente) e <strong>TPRA</strong> (média da tendência — ΔIRE de 7 dias — dos
          adversários). Os seguidores também aparecem como índice dos últimos 7 dias. Esses números
          são reais por candidato.
        </p>
        <Link
          href="/basecalculo"
          style={{
            display: "block",
            marginTop: 10,
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid rgba(22,199,132,0.35)",
            background: "rgba(22,199,132,0.08)",
            color: "#16C784",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Ver a base de cálculo · candidato por candidato →
        </Link>
      </div>

      {/* ── como é calculado (vivo) ── */}
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Como é calculado · agora</span>
          <LiveBadge ch="idx.sost" cadenceMs={2000} />
        </div>
        {idx ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div className="m-headline-num">
                <Odometer value={idx.valor} decimals={2} />
              </div>
              <div className={`m-headline-var ${idx.variacaoDia >= 0 ? "m-up-c" : "m-down-c"}`}>
                {idx.variacaoDia >= 0 ? "▲" : "▼"}{" "}
                <Odometer value={idx.variacaoDia} decimals={2} signed suffix="%" /> hoje
              </div>
            </div>
            <p
              className="m-mono"
              style={{
                fontSize: 10.5,
                lineHeight: 1.6,
                margin: "8px 0",
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--m-card-2)",
                border: "1px solid var(--m-border)",
                color: "#cfd6e4",
              }}
            >
              índice = {formula ?? "média ponderada dos 4 componentes"}
            </p>
            <p style={{ fontSize: 11, lineHeight: 1.5, margin: "0 0 8px", color: "var(--m-muted)" }}>
              Os pesos vêm da watchlist (editável em config) e podem ser ajustados por estratégia —
              ex.: numa semana de crise de imprensa, aumentar o peso de imprensa/sentimento.
            </p>
            {option ? (
              <div data-no-swipe>
                <EChart option={option} height={180} />
              </div>
            ) : null}
          </>
        ) : (
          <div className="m-ghost">sincronizando com o stream…</div>
        )}
      </div>

      {/* ── os 4 componentes ── */}
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Os 4 componentes e de onde vêm</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {COMPONENTES.map((c) => {
            const fonte = idx?.fontes?.[c.key];
            const pesoPct = pesos ? Math.round(pesos[c.key] * 100) : null;
            return (
              <div
                key={c.key}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "var(--m-card-2)",
                  border: "1px solid var(--m-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 3,
                  }}
                >
                  <strong style={{ fontSize: 12 }}>{c.nome}</strong>
                  {pesoPct !== null ? (
                    <span className="m-pill" style={{ fontSize: 9 }}>peso {pesoPct}%</span>
                  ) : null}
                  <FonteBadge real={fonte === "real"} como={c.como} />
                  {idx ? (
                    <span className="m-mono" style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800 }}>
                      <Odometer value={idx.breakdown[c.key]} decimals={1} />
                    </span>
                  ) : null}
                </div>
                <p style={{ fontSize: 11, lineHeight: 1.5, margin: "0 0 3px", color: "#cfd6e4" }}>
                  {c.oQueMede}
                </p>
                <p style={{ fontSize: 10, margin: 0, color: "var(--m-muted)" }}>
                  Extração: {c.extracao}.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── correlação com o Brandwatch ── */}
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Correlação com o índice de sentimento do Brandwatch</span>
        </div>
        <p style={{ fontSize: 11.5, lineHeight: 1.55, margin: "2px 0 8px", color: "#cfd6e4" }}>
          O {simbolo}-IDX espelha a filosofia do <strong>Brandwatch Consumer Research</strong>, a
          referência de mercado em saúde de marca: classificar menções com IA para extrair um{" "}
          <strong>sentiment score</strong> (% positivo − % negativo), medir{" "}
          <strong>volume de menções</strong> e <strong>alcance de audiência</strong>, e condensar
          tudo num indicador acompanhável no tempo. A diferença é que aqui cada sinal vem de{" "}
          <strong>fonte aberta e gratuita</strong>, sem licença paga.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BRANDWATCH_LINHAS.map((l) => (
            <div
              key={l.brandwatch}
              style={{
                padding: "7px 10px",
                borderRadius: 10,
                background: "var(--m-card-2)",
                border: "1px solid var(--m-border)",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--m-muted)", marginBottom: 2 }}>
                <strong style={{ color: "#8ab4f8" }}>Brandwatch</strong> · {l.brandwatch}
              </div>
              <div style={{ fontSize: 10.5, color: "#cfd6e4" }}>
                <strong style={{ color: "#16C784" }}>{simbolo}-IDX</strong> · {l.sost}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10.5, lineHeight: 1.5, margin: "8px 0 0", color: "var(--m-muted)" }}>
          O que difere: o Brandwatch varre redes fechadas com licenças pagas e janelas longas; o{" "}
          {simbolo}-IDX usa janela curta (7–30 dias), normaliza tudo em torno de 100 (o “normal” do
          candidato) e deixa os pesos configuráveis pela campanha — um índice operacional, não um
          relatório de mercado.
        </p>
      </div>

      {/* ── limitações ── */}
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Limitações e honestidade dos dados</span>
        </div>
        <ul
          style={{
            fontSize: 11,
            lineHeight: 1.6,
            margin: 0,
            paddingLeft: 18,
            color: "var(--m-muted)",
          }}
        >
          <li>
            Componentes marcados <strong style={{ color: "#F5A623" }}>DEMO</strong> caem em
            série sintética quando a fonte real está indisponível (ex.: Google Trends bloqueado no
            servidor) — o badge de cada componente acima mostra o estado em tempo real.
          </li>
          <li>
            Redes fechadas (X/Twitter, Instagram, TikTok, Facebook) exigem credencial ou API paga e
            ficam fora do índice por enquanto — a base online vem do YouTube, que é aberto.
          </li>
          <li>
            O histórico de candles é persistido localmente a cada fechamento diário; dias anteriores
            à ativação da coleta são modelados.
          </li>
        </ul>
      </div>

      <Link
        href="/m"
        className="m-btn"
        style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
      >
        <ArrowLeft size={15} /> Voltar ao cockpit
      </Link>
    </div>
  );
}
