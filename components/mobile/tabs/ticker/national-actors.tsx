"use client";

// Vento nacional — em vez de "cotações" com score −100..+100 (que confundia),
// agrupa os atores nacionais em ALIADOS × ADVERSÁRIOS do deputado e mostra o
// momentum de cada um (subindo/caindo na semana). Para o candidato: aliado
// subindo = bom; adversário subindo = atenção.

import { useMemo } from "react";

import { useLiveChannel } from "@/components/mobile/live/use-live";
import { LiveBadge } from "@/components/mobile/ui/live-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import type { QuoteNac, QuotesNacSnapshot } from "@/lib/live-schemas";
import type { AtorNacional, Watchlist } from "@/lib/watchlist";

// Partidos de oposição ao campo do deputado (PL/direita) → adversários.
const ADVERSARIO_PARTIDOS = new Set(["PT", "PSOL", "PSB", "PCdoB", "PDT", "Rede"]);

function ehAdversario(partido?: string): boolean {
  return partido ? ADVERSARIO_PARTIDOS.has(partido) : false;
}

function momento(dir: QuoteNac["dir"]): { arrow: string; palavra: string; cls: string } {
  if (dir === "up") return { arrow: "▲", palavra: "subindo", cls: "m-up-c" };
  if (dir === "down") return { arrow: "▼", palavra: "caindo", cls: "m-down-c" };
  return { arrow: "▬", palavra: "estável", cls: "m-muted-c" };
}

function Ator({ meta, quote }: { meta: AtorNacional; quote: QuoteNac }) {
  const m = momento(quote.dir);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
      <span style={{ fontSize: 12 }}>
        <strong>{meta.nome}</strong>{" "}
        {meta.partido ? <span className="m-muted-c" style={{ fontSize: 10 }}>{meta.partido}</span> : null}
      </span>
      <span className={`m-mono ${m.cls}`} style={{ fontSize: 11, fontWeight: 700 }}>
        {m.arrow} {m.palavra}
      </span>
    </div>
  );
}

export function NationalActors() {
  const watchlist = useLiveChannel<Watchlist>("watchlist").data;
  const nac = useLiveChannel<QuotesNacSnapshot>("quotes.nac").data;

  const grupos = useMemo(() => {
    if (!watchlist || !nac) return null;
    const byId = new Map(nac.atores.map((a) => [a.id, a]));
    const pares = watchlist.atores_nacionais
      .map((meta) => ({ meta, quote: byId.get(meta.id) }))
      .filter((x): x is { meta: AtorNacional; quote: QuoteNac } => Boolean(x.quote));
    const aliados = pares.filter((p) => !ehAdversario(p.meta.partido));
    const adversarios = pares.filter((p) => ehAdversario(p.meta.partido));
    const aliadosSubindo = aliados.filter((p) => p.quote.dir === "up").length;
    const advSubindo = adversarios.filter((p) => p.quote.dir === "up").length;
    return { aliados, adversarios, favoravel: aliadosSubindo >= advSubindo };
  }, [watchlist, nac]);

  return (
    <div className="m-card">
      <div className="m-card-head">
        <span className="m-card-title">Vento nacional · aliados × adversários</span>
        <LiveBadge ch="quotes.nac" cadenceMs={5000} />
      </div>
      {grupos ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: "#16C784", fontSize: 11, fontWeight: 800, marginBottom: 2 }}>
                ALIADOS
              </div>
              {grupos.aliados.map((p) => (
                <Ator key={p.meta.id} meta={p.meta} quote={p.quote} />
              ))}
            </div>
            <div>
              <div style={{ color: "#EA3943", fontSize: 11, fontWeight: 800, marginBottom: 2 }}>
                ADVERSÁRIOS
              </div>
              {grupos.adversarios.map((p) => (
                <Ator key={p.meta.id} meta={p.meta} quote={p.quote} />
              ))}
            </div>
          </div>
          <SectionLeitura>
            {grupos.favoravel
              ? "Vento a favor: os aliados estão com mais força que os adversários esta semana."
              : "Atenção: os adversários ganharam tração esta semana — momento de reforçar a presença."}
          </SectionLeitura>
        </>
      ) : (
        <div className="m-ghost">sincronizando…</div>
      )}
    </div>
  );
}
