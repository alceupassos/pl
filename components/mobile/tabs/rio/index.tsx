"use client";

// Aba RIO — a eleição dele: mapa municipal vivo, mini-cards por região,
// racing dos concorrentes no estado e o equalizador do ecossistema evangélico.

import { useMemo } from "react";

import { EChart } from "@/components/echart";
import { useLiveChannel } from "@/components/mobile/live/use-live";
import {
  areaStackOption,
  groupedBarsOption,
  racingBarOption,
  sparklineOption,
} from "@/components/mobile/m-chart-options";
import { MapaRj } from "@/components/mobile/tabs/rio/mapa-rj";
import { FlipCard } from "@/components/mobile/ui/flip-card";
import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { LeituraIA } from "@/components/mobile/ui/leitura-ia";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { Odometer } from "@/components/mobile/ui/odometer";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { RioPulsos } from "@/lib/live-schemas";
import type { Watchlist } from "@/lib/watchlist";

// Paleta de séries para o momentum por região (verso do card de Regiões).
const SERIE_CORES = ["#16C784", "#3b82f6", "#f0c030", "#8b5cf6", "#EA3943", "#06b6d4", "#f97316", "#ec4899"];

function RegionCardsFront({ rio }: { rio: RioPulsos }) {
  const total = rio.regioes.reduce((s, r) => s + r.mencoes, 0);
  const top = [...rio.regioes].sort((a, b) => b.mencoes - a.mencoes)[0];
  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Regiões · menções agora</span>
        <LeituraIA
          card="rio-regioes"
          contexto={`${rio.regioes.length} regiões; ${total} menções; top ${top?.nome ?? "?"} ${top?.mencoes ?? 0}`}
          titulo="Regiões · menções"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="rio.pulsos" cadenceMs={8000} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {rio.regioes.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid var(--m-border)",
              borderRadius: 10,
              padding: "8px 10px",
              background: "var(--m-card-2)",
            }}
          >
            <div className="m-muted-c" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {r.nome}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="m-mono" style={{ fontSize: 15, fontWeight: 800 }}>
                <Odometer value={r.mencoes} />
              </span>
              <div style={{ flex: 1 }}>
                <EChart option={sparklineOption(r.spark, "#16C784")} height={22} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="m-flip-hint">↻ toque para ver o momentum de menções por região</div>
    </div>
  );
}

function RegionCardsBack({ rio }: { rio: RioPulsos }) {
  const option = useMemo(() => {
    const top = [...rio.regioes].sort((a, b) => b.mencoes - a.mencoes).slice(0, 5);
    const len = Math.max(0, ...top.map((r) => r.spark.length));
    const labels = Array.from({ length: len }, (_, i) => `${i + 1}`);
    return areaStackOption({
      labels,
      series: top.map((r, i) => ({
        nome: r.nome,
        cor: SERIE_CORES[i % SERIE_CORES.length],
        data: r.spark,
        area: true,
      })),
    });
  }, [rio.regioes]);

  const ord = useMemo(() => [...rio.regioes].sort((a, b) => b.mencoes - a.mencoes), [rio.regioes]);
  const lider = ord[0];
  const lanterna = ord[ord.length - 1];

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Momentum de menções · por região</span>
        <FonteBadge real={false} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        {lider && lanterna && lider !== lanterna
          ? `${lider.nome} puxa o volume (${lider.mencoes} menções) e ${lanterna.nome} é o piso (${lanterna.mencoes}) — equilibre a presença onde está fraca.`
          : "Acompanhe a curva para ver onde o ritmo de menções está acelerando."}
      </SectionLeitura>
    </div>
  );
}

function RegionCards({ rio }: { rio: RioPulsos }) {
  return <FlipCard front={<RegionCardsFront rio={rio} />} back={<RegionCardsBack rio={rio} />} />;
}

function RacingRjFront({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  const option = useMemo(() => {
    const meta = new Map((watchlist?.concorrentes_rj ?? []).map((c) => [c.simbolo, c]));
    return racingBarOption({
      items: rio.racing.map((r) => {
        const m = meta.get(r.simbolo);
        return {
          nome: m ? `${m.nome} (${m.partido})` : r.simbolo,
          valor: r.mencoes,
          cor: m?.cor ?? "#3b82f6",
        };
      }),
    });
  }, [rio.racing, watchlist]);

  const lider = rio.racing[0];
  const ctx = lider
    ? `top ${nomeConcorrente(lider.simbolo, watchlist)} ${lider.mencoes} menções; ${rio.racing.length} concorrentes`
    : `${rio.racing.length} concorrentes`;

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Racing · concorrentes no RJ (menções)</span>
        <LeituraIA card="rio-racing" contexto={ctx} titulo="Racing · concorrentes RJ" />
        <FonteBadge real={false} />
        <LiveBadge ch="rio.pulsos" cadenceMs={8000} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={150} />
      </div>
      <div className="m-flip-hint">↻ toque para ver quem cresce mais</div>
    </div>
  );
}

function nomeConcorrente(simbolo: string, watchlist: Watchlist | null) {
  const m = (watchlist?.concorrentes_rj ?? []).find((c) => c.simbolo === simbolo);
  return m ? m.nome : simbolo;
}

function RacingRjBack({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  const option = useMemo(() => {
    const ord = [...rio.racing].sort((a, b) => b.crescimento - a.crescimento);
    const labels = ord.map((r) => nomeConcorrente(r.simbolo, watchlist));
    return groupedBarsOption({
      labels,
      series: [
        { nome: "menções", cor: "#3b82f6", data: ord.map((r) => r.mencoes) },
        { nome: "crescimento", cor: "#16C784", data: ord.map((r) => r.crescimento) },
      ],
      horizontal: true,
      suffix: "",
    });
  }, [rio.racing, watchlist]);

  const top = useMemo(
    () => [...rio.racing].sort((a, b) => b.crescimento - a.crescimento)[0],
    [rio.racing],
  );

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Quem cresce mais · RJ</span>
        <FonteBadge real={false} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        {top
          ? `${nomeConcorrente(top.simbolo, watchlist)} é quem mais acelera (${top.crescimento > 0 ? "+" : ""}${top.crescimento}) — vigie o avanço dele no estado.`
          : "Acompanhe o crescimento para antecipar quem está subindo no RJ."}
      </SectionLeitura>
    </div>
  );
}

function RacingRj({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  return (
    <FlipCard
      front={<RacingRjFront rio={rio} watchlist={watchlist} />}
      back={<RacingRjBack rio={rio} watchlist={watchlist} />}
    />
  );
}

function EqualizadorEvangelicoFront({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  const nomes = useMemo(
    () => new Map((watchlist?.ecossistema_evangelico ?? []).map((e) => [e.id, e])),
    [watchlist],
  );
  const top = [...rio.evangelico].sort((a, b) => b.atividade - a.atividade)[0];

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Equalizador · ecossistema evangélico RJ</span>
        <LeituraIA
          card="rio-evangelico"
          contexto={`${rio.evangelico.length} entidades; top ${nomeEvangelico(top?.id ?? "", watchlist)} ${top?.atividade ?? 0}/100`}
          titulo="Ecossistema evangélico RJ"
        />
        <FonteBadge real={false} />
        <LiveBadge ch="rio.pulsos" cadenceMs={8000} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 110, padding: "0 2px" }}>
        {rio.evangelico.map((e) => {
          const meta = nomes.get(e.id);
          return (
            <div key={e.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max(4, e.atividade)}%`,
                    borderRadius: "4px 4px 0 0",
                    background:
                      e.atividade > 75
                        ? "var(--m-up)"
                        : e.atividade > 40
                          ? "var(--m-accent)"
                          : "var(--m-border)",
                    transition: "height 0.7s cubic-bezier(0.4,0,0.2,1), background 0.7s",
                  }}
                  title={`${meta?.nome ?? e.id}: ${e.atividade}`}
                />
              </div>
              <span
                className="m-muted-c"
                style={{ fontSize: 7.5, fontFamily: "var(--m-font-mono)", textAlign: "center", lineHeight: 1.15, minHeight: 18 }}
              >
                {(meta?.nome ?? e.id).split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="m-feed-meta">
        <span>atividade 0–100 por igreja/canal/rádio · barra alta = mobilizado agora</span>
      </div>
      <div className="m-flip-hint">↻ toque para ver as entidades mais ativas</div>
    </div>
  );
}

function nomeEvangelico(id: string, watchlist: Watchlist | null) {
  const m = (watchlist?.ecossistema_evangelico ?? []).find((e) => e.id === id);
  return m ? m.nome : id;
}

function EqualizadorEvangelicoBack({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  const option = useMemo(() => {
    const ord = [...rio.evangelico].sort((a, b) => b.atividade - a.atividade);
    return racingBarOption({
      max: 100,
      items: ord.map((e) => ({
        nome: nomeEvangelico(e.id, watchlist),
        valor: e.atividade,
        cor: e.atividade > 75 ? "#16C784" : e.atividade > 40 ? "#f0c030" : "#6b7280",
      })),
    });
  }, [rio.evangelico, watchlist]);

  const top = useMemo(
    () => [...rio.evangelico].sort((a, b) => b.atividade - a.atividade)[0],
    [rio.evangelico],
  );

  return (
    <div className="m-card" style={{ height: "100%", overflowY: "auto" }}>
      <div className="m-card-head">
        <span className="m-card-title">Entidades mais ativas · evangélico RJ</span>
        <FonteBadge real={false} />
      </div>
      <div data-no-swipe onClick={(e) => e.stopPropagation()}>
        <EChart option={option} height={190} />
      </div>
      <SectionLeitura>
        {top
          ? `${nomeEvangelico(top.id, watchlist)} está no pico de mobilização (${top.atividade}/100) — priorize presença onde a base já está aquecida.`
          : "Acompanhe a atividade para saber quais canais estão mobilizados agora."}
      </SectionLeitura>
    </div>
  );
}

function EqualizadorEvangelico({ rio, watchlist }: { rio: RioPulsos; watchlist: Watchlist | null }) {
  if (!rio.evangelico.length) return null;
  return (
    <FlipCard
      front={<EqualizadorEvangelicoFront rio={rio} watchlist={watchlist} />}
      back={<EqualizadorEvangelicoBack rio={rio} watchlist={watchlist} />}
    />
  );
}

export default function RioTab() {
  const rio = useLiveChannel<RioPulsos>("rio.pulsos").data;
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;

  if (!rio) return <div className="m-ghost">sincronizando com o estado…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <MapaRj />
      <RegionCards rio={rio} />
      <RacingRj rio={rio} watchlist={watchlist} />
      <EqualizadorEvangelico rio={rio} watchlist={watchlist} />
    </div>
  );
}
