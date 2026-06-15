import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import type { MarketEntry } from "@/lib/w/w-mock";
import { ProbabilityBar } from "./probability-bar";

const CARGO_LABELS: Record<string, string> = {
  presidente: "Presidente",
  governador_rj: "Governador RJ",
  senador_rj: "Senador RJ",
  dep_federal_rj: "Dep. Federal RJ",
};

export function MarketCard({ entry }: { entry: MarketEntry }) {
  const positivo = entry.delta7d >= 0;
  return (
    <article className="m-quote-card w-market-card">
      <div className="m-quote-head">
        <span className="w-cargo-chip">{CARGO_LABELS[entry.cargo] ?? entry.cargo}</span>
        <FonteBadge
          real={entry.fonteReal}
          como={
            entry.fonteReal
              ? "Agregador PesqEle TSE + Monte Carlo 1.000 simulações"
              : undefined
          }
        />
      </div>
      <div className="m-quote-nome">
        {entry.candidato}{" "}
        <span className="m-muted-c" style={{ fontWeight: 400, fontSize: 11 }}>
          ({entry.partido})
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
        <span className="m-quote-val" style={{ color: entry.cor }}>
          {entry.pct}%
        </span>
        <span
          className={`m-mono ${positivo ? "m-up-c" : "m-down-c"}`}
          style={{ fontSize: 11.5, fontWeight: 700 }}
        >
          {positivo ? "▲" : "▼"} {Math.abs(entry.delta7d).toFixed(1)}pp 7d
        </span>
      </div>
      <ProbabilityBar value={entry.pct / 100} cor={entry.cor} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <span className="m-muted-c" style={{ fontSize: 9.5 }}>
          vencer:{" "}
          <strong style={{ color: entry.cor }}>
            {Math.round(entry.probVencer * 100)}%
          </strong>
        </span>
        <span className="m-muted-c" style={{ fontSize: 9.5 }}>
          top-2:{" "}
          <strong style={{ color: entry.cor }}>
            {Math.round(entry.probTop2 * 100)}%
          </strong>
        </span>
      </div>
    </article>
  );
}
