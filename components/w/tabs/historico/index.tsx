"use client";

import { useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { compareLinesOption } from "@/components/mobile/m-chart-options";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { snapshotMercados, type Cargo } from "@/lib/w/w-mock";

const _LOAD_NOW = Date.now();

const CARGOS: { id: Cargo; label: string }[] = [
  { id: "presidente", label: "Presidente" },
  { id: "governador_rj", label: "Gov. RJ" },
  { id: "senador_rj", label: "Senador RJ" },
  { id: "dep_federal_rj", label: "Dep. Fed. RJ" },
];

export default function HistoricoWTab() {
  const [cargo, setCargo] = useState<Cargo>("presidente");
  const snap = useMemo(() => snapshotMercados(_LOAD_NOW), []);

  const opt = useMemo(() => {
    const entries = snap[cargo];
    const labels = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(_LOAD_NOW - (29 - i) * 86_400_000);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    const series = entries.map((e) => ({
      nome: e.candidato,
      cor: e.cor,
      data: e.historico30d,
    }));
    return compareLinesOption({ labels, series, normalize: false });
  }, [snap, cargo]);

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Histórico · 30 dias</span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {CARGOS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCargo(c.id)}
              className={`m-pill ${cargo === c.id ? "up" : ""}`}
              style={{ fontSize: 10 }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div data-no-swipe onClick={(e) => e.stopPropagation()}>
          <EChart option={opt} height={220} />
        </div>
        <p className="m-muted-c" style={{ fontSize: 10.5, marginTop: 6 }}>
          Toque na legenda para ligar/desligar candidato · pinça para zoom.
        </p>
      </div>
      <SectionLeitura>
        Evolução da % agregada diária por candidato. Fonte: agregador PesqEle + Monte Carlo.
      </SectionLeitura>
    </div>
  );
}
