"use client";

import { useEffect, useState, useMemo } from "react";
import { UFS, UF_NOME } from "@/lib/telao/ufs";

export type CargoPleito = "presidente" | "governador" | "senador" | "deputado-federal" | "deputado-estadual";

interface MiniMapaProps {
  ufSel: string;
  onSelectUf: (uf: string) => void;
  cargoInicial?: CargoPleito;
}

export function MiniMapaPleito({ ufSel, onSelectUf, cargoInicial = "governador" }: MiniMapaProps) {
  const [cargo, setCargo] = useState<CargoPleito>(cargoInicial);
  const [andamento, setAndamento] = useState<Record<string, { pctUrnas: number; status: string; lider?: string }>>({});
  const [hoverUf, setHoverUf] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/telao/nacional")
      .then((r) => r.json())
      .then((data) => {
        const mapa: Record<string, { pctUrnas: number; status: string; lider?: string }> = {};
        if (cargo === "governador" && data.governadores) {
          for (const g of data.governadores) {
            mapa[g.uf] = { pctUrnas: g.pctUrnas, status: g.status, lider: g.cand?.[0]?.nome };
          }
        } else if (cargo === "senador" && data.senado) {
          for (const s of data.senado) {
            mapa[s.uf] = { pctUrnas: s.pctUrnas, status: s.status, lider: s.cand?.[0]?.nome };
          }
        } else if (cargo === "deputado-federal" && data.camara?.porUF) {
          for (const c of data.camara.porUF) {
            mapa[c.uf] = { pctUrnas: c.pctUrnas, status: c.pctUrnas > 0 ? "em_apuracao" : "aguardando" };
          }
        } else if (cargo === "deputado-estadual" && data.assembleias?.porUF) {
          for (const a of data.assembleias.porUF) {
            mapa[a.uf] = { pctUrnas: a.pctUrnas, status: a.pctUrnas > 0 ? "em_apuracao" : "aguardando" };
          }
        } else {
          // Presidente / Fallback
          const pctPadrao = data.pctUrnasMedia || 0;
          for (const u of UFS) {
            mapa[u] = { pctUrnas: pctPadrao, status: pctPadrao > 0 ? "em_apuracao" : "aguardando" };
          }
        }
        setAndamento(mapa);
      })
      .catch(() => {});
  }, [cargo]);

  const getColor = (u: string) => {
    const info = andamento[u];
    const pct = info?.pctUrnas ?? 0;
    if (pct === 0) return "#334155";
    if (pct < 25) return "#0284c7";
    if (pct < 50) return "#06b6d4";
    if (pct < 85) return "#eab308";
    if (pct < 100) return "#f97316";
    return "#22c55e";
  };

  const cargos: { id: CargoPleito; rotulo: string }[] = [
    { id: "presidente", rotulo: "Presid." },
    { id: "governador", rotulo: "Govern." },
    { id: "senador", rotulo: "Senado" },
    { id: "deputado-federal", rotulo: "Dep. Fed." },
    { id: "deputado-estadual", rotulo: "Dep. Est." },
  ];

  return (
    <div className="mini-mapa-box">
      <div className="mini-mapa-head">
        <span className="mini-mapa-title">ANDAMENTO DO PLEITO</span>
        <div className="mini-mapa-cargos">
          {cargos.map((c) => (
            <button
              key={c.id}
              className={`mini-cargo-btn ${cargo === c.id ? "on" : ""}`}
              onClick={() => setCargo(c.id)}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mini-mapa-grid-ufs">
        {UFS.map((u) => {
          const info = andamento[u];
          const pct = info ? Math.round(info.pctUrnas) : 0;
          const isSel = ufSel === u;
          const isHov = hoverUf === u;
          return (
            <button
              key={u}
              className={`mini-uf-badge ${isSel ? "sel" : ""} ${isHov ? "hov" : ""}`}
              style={{
                borderColor: isSel || isHov ? "#ffffff" : getColor(u),
                backgroundColor: isSel || isHov ? getColor(u) : "rgba(15, 23, 42, 0.8)",
                boxShadow: isSel || isHov ? `0 0 10px ${getColor(u)}` : undefined,
              }}
              onMouseEnter={() => setHoverUf(u)}
              onMouseLeave={() => setHoverUf(null)}
              onClick={() => onSelectUf(u)}
              title={`${UF_NOME[u]}: ${pct}% apurado ${info?.lider ? `· Líder: ${info.lider}` : ""}`}
            >
              <span className="mini-uf-sigla">{u.toUpperCase()}</span>
              <span className="mini-uf-pct" style={{ color: isSel || isHov ? "#fff" : getColor(u) }}>
                {pct > 0 ? `${pct}%` : "—"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mini-mapa-legenda">
        <span><i style={{ background: "#334155" }} /> 0%</span>
        <span><i style={{ background: "#0284c7" }} /> 1-50%</span>
        <span><i style={{ background: "#eab308" }} /> 51-85%</span>
        <span><i style={{ background: "#f97316" }} /> 86-99%</span>
        <span><i style={{ background: "#22c55e" }} /> 100%</span>
      </div>
    </div>
  );
}
