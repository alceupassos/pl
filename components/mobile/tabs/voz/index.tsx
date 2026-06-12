"use client";

// Aba VOZ DO ELEITORADO — o chat vivo da rua: hero com o volume do dia e o
// termômetro de sentimento, a quebra por fonte (WhatsApp do eleitor + redes) e
// o feed estilo WhatsApp com a bolha de cada mensagem. O canal SSE "voz"
// entrega snapshot (40 msgs) + delta (1 msg nova) a cada 2,5s; aqui só lemos.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import { donutOption, groupedBarsOption } from "@/components/mobile/m-chart-options";
import { ChatBubble } from "@/components/mobile/ui/chat-bubble";
import { FlashCard } from "@/components/mobile/ui/flash-card";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { MOraculo } from "@/components/mobile/ui/m-oraculo";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { StatPill } from "@/components/mobile/ui/stat-pill";
import type { VozFonte, VozSnapshot } from "@/lib/live-schemas";

// Rótulo e cor de cada fonte (eleitor primeiro — é a coluna da campanha).
const FONTES: { id: VozFonte; rotulo: string; cor: string }[] = [
  { id: "eleitor", rotulo: "Eleitores · WhatsApp", cor: "#16C784" },
  { id: "x", rotulo: "X", cor: "#d6dbe2" },
  { id: "instagram", rotulo: "Instagram", cor: "#E1306C" },
  { id: "facebook", rotulo: "Facebook", cor: "#1877F2" },
  { id: "youtube", rotulo: "YouTube", cor: "#FF4444" },
];

/* ① HERO — volume do dia + termômetro de sentimento */
function HeroVoz({ voz }: { voz: VozSnapshot }) {
  return <FlipCard front={<HeroVozFront voz={voz} />} back={<HeroVozBack voz={voz} />} />;
}

/* ── FRENTE ── */
function HeroVozFront({ voz }: { voz: VozSnapshot }) {
  const c = voz.contadores;
  const donut = useMemo(
    () =>
      donutOption({
        items: [
          { nome: "Positivo", valor: c.sentimento.pos, cor: "#16C784" },
          { nome: "Neutro", valor: c.sentimento.neu, cor: "#8a93a8" },
          { nome: "Negativo", valor: c.sentimento.neg, cor: "#EA3943" },
        ],
        centro: { valor: `${c.sentimento.pos.toFixed(0)}%`, label: "positivo" },
      }),
    [c.sentimento.pos, c.sentimento.neu, c.sentimento.neg],
  );
  const saldo = c.sentimento.pos - c.sentimento.neg;

  return (
    <FlashCard watch={c.totalHoje}>
      <div className="m-card-head">
        <span className="m-card-title">Voz do eleitorado · hoje</span>
        <FonteBadge real={false} />
        <LiveBadge ch="voz" cadenceMs={2500} />
      </div>
      <div className="m-headline-num">
        <Odometer value={c.totalHoje} />
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "6px 0" }}>
        <StatPill label="mensagens/min" value={c.porMinuto} decimals={1} tone="up" />
        <StatPill
          label="saldo de sentimento"
          value={saldo}
          decimals={0}
          suffix=" pts"
          tone={saldo >= 0 ? "up" : "down"}
        />
      </div>
      <EChart option={donut} height={150} />
      <SectionLeitura>
        {saldo >= 0
          ? `O clima pende positivo: ${c.sentimento.pos.toFixed(0)}% de mensagens a favor contra ${c.sentimento.neg.toFixed(0)}% contra (saldo +${saldo.toFixed(0)} pts).`
          : `Atenção: o negativo passou o positivo — ${c.sentimento.neg.toFixed(0)}% contra ${c.sentimento.pos.toFixed(0)}% a favor (saldo ${saldo.toFixed(0)} pts). Hora de responder.`}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver o clima do eleitorado</div>
    </FlashCard>
  );
}

/* ── VERSO — clima do eleitorado (volume absoluto por sentimento) ── */
function HeroVozBack({ voz }: { voz: VozSnapshot }) {
  const c = voz.contadores;
  const donut = useMemo(
    () =>
      donutOption({
        items: [
          { nome: "Positivo", valor: c.sentimento.pos, cor: "#16C784" },
          { nome: "Neutro", valor: c.sentimento.neu, cor: "#8a93a8" },
          { nome: "Negativo", valor: c.sentimento.neg, cor: "#EA3943" },
        ],
        centro: { valor: String(c.totalHoje), label: "hoje" },
      }),
    [c.sentimento.pos, c.sentimento.neu, c.sentimento.neg, c.totalHoje],
  );
  const saldo = c.sentimento.pos - c.sentimento.neg;

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Clima do eleitorado</span>
        <FonteBadge real={false} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={donut} height={170} />
      </div>
      <SectionLeitura>
        {saldo >= 0
          ? `Entre as ${c.totalHoje} mensagens de hoje, o positivo (${c.sentimento.pos.toFixed(0)}%) supera o negativo (${c.sentimento.neg.toFixed(0)}%) — o eleitorado está a favor.`
          : `Entre as ${c.totalHoje} mensagens de hoje, o negativo (${c.sentimento.neg.toFixed(0)}%) já passou o positivo (${c.sentimento.pos.toFixed(0)}%) — o clima virou. Hora de agir.`}
      </SectionLeitura>
    </div>
  );
}

/* ② DE ONDE VEM A VOZ — quebra por fonte (eleitor + redes) */
function PorFonte({ voz }: { voz: VozSnapshot }) {
  return <FlipCard front={<PorFonteFront voz={voz} />} back={<PorFonteBack voz={voz} />} />;
}

/* ── FRENTE ── */
function PorFonteFront({ voz }: { voz: VozSnapshot }) {
  const porFonte = voz.contadores.porFonte;
  const linhas = FONTES.map((f) => ({ ...f, total: porFonte[f.id] ?? 0 }));
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const lider = [...linhas].sort((a, b) => b.total - a.total)[0];
  const totalRedes = linhas
    .filter((l) => l.id !== "eleitor")
    .reduce((s, l) => s + l.total, 0);
  const totalEleitor = porFonte.eleitor ?? 0;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">De onde vem a voz</span>
        <FonteBadge real={false} />
        <LiveBadge ch="voz" cadenceMs={2500} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {linhas.map((l) => (
          <div key={l.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                marginBottom: 3,
              }}
            >
              <span style={{ color: l.cor, fontWeight: 700 }}>{l.rotulo}</span>
              <span className="m-mono">
                <Odometer value={l.total} />
              </span>
            </div>
            <div className="m-bar">
              <span style={{ width: `${(l.total / max) * 100}%`, background: l.cor }} />
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        {lider
          ? `${lider.rotulo} é o maior canal agora. O WhatsApp do eleitor (${totalEleitor}) ${
              totalEleitor >= totalRedes
                ? `ainda fala mais alto que todas as redes somadas (${totalRedes}) — base orgânica forte.`
                : `já foi ultrapassado pelas redes somadas (${totalRedes}) — a conversa migrou pro digital.`
            }`
          : "Sem fontes para ler agora."}
      </SectionLeitura>
      <div className="m-flip-hint">↻ toque para ver onde a voz é mais forte</div>
    </div>
  );
}

/* ── VERSO — mensagens por fonte (onde a voz é mais forte) ── */
function PorFonteBack({ voz }: { voz: VozSnapshot }) {
  const porFonte = voz.contadores.porFonte;
  const linhas = FONTES.map((f) => ({ ...f, total: porFonte[f.id] ?? 0 }));
  const bars = groupedBarsOption({
    labels: FONTES.map((f) => f.rotulo),
    series: [{ nome: "mensagens", cor: "#16C784", data: linhas.map((l) => l.total) }],
    horizontal: true,
  });
  const lider = [...linhas].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Onde a voz é mais forte</span>
        <FonteBadge real={false} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={bars} height={180} />
      </div>
      <SectionLeitura>
        {lider && lider.total > 0
          ? `${lider.rotulo} concentra o maior volume de mensagens agora (${lider.total}) — é por aí que a conversa está passando.`
          : "Sem volume suficiente para comparar as fontes agora."}
      </SectionLeitura>
    </div>
  );
}

/* ③ CHAT AO VIVO — o feed estilo WhatsApp, bolha por mensagem */
function ChatAoVivo({ voz, lastAt }: { voz: VozSnapshot; lastAt: number }) {
  // agoraS deriva do relógio do canal (lastAt), nunca de Date.now() no render.
  const agoraS = Math.floor(lastAt / 1000);
  const msgs = voz.mensagens.slice(0, 30);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Chat ao vivo</span>
        <FonteBadge real={false} />
        <LiveBadge ch="voz" cadenceMs={2500} />
      </div>
      <div>
        {msgs.map((msg, i) =>
          i === 0 ? (
            <FlashCard key={msg.id} watch={msg.t}>
              <ChatBubble msg={msg} agoraS={agoraS} />
            </FlashCard>
          ) : (
            <ChatBubble key={msg.id} msg={msg} agoraS={agoraS} />
          ),
        )}
      </div>
      <SectionLeitura>
        Cada bolha é uma fala real chegando da rua e das redes — verde é eleitor, as
        outras cores são as redes sociais.
      </SectionLeitura>
    </div>
  );
}

export default function VozTab() {
  const { data, lastAt } = useLiveChannel<VozSnapshot>("voz");
  if (!data) {
    return <div className="m-ghost">sincronizando…</div>;
  }

  const c = data.contadores;
  const saldo = c.sentimento.pos - c.sentimento.neg;
  const totalRedes =
    (c.porFonte.x ?? 0) +
    (c.porFonte.instagram ?? 0) +
    (c.porFonte.facebook ?? 0) +
    (c.porFonte.youtube ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <HeroVoz voz={data} />
      <PorFonte voz={data} />
      <ChatAoVivo voz={data} lastAt={lastAt} />
      <MOraculo
        section="m-voz"
        context={`volume hoje ${c.totalHoje} mensagens (${c.porMinuto}/min); sentimento ${c.sentimento.pos.toFixed(0)}% positivo, ${c.sentimento.neg.toFixed(0)}% negativo, saldo ${saldo.toFixed(0)} pts; fontes: eleitor ${c.porFonte.eleitor ?? 0}, redes somadas ${totalRedes}`}
      />
    </div>
  );
}
