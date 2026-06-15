"use client";

import { useMemo, useState } from "react";

import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { snapshotCandidatos, type Cargo } from "@/lib/w/w-mock";

const CARGOS: { id: Cargo | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "presidente", label: "Presidente" },
  { id: "governador_sp", label: "Gov. SP" },
  { id: "governador_rj", label: "Gov. RJ" },
  { id: "senador_rj", label: "Senador RJ" },
  { id: "dep_federal_rj", label: "Dep. Fed. RJ" },
];

export default function CandidatosWTab() {
  const [cargo, setCargo] = useState<Cargo | "todos">("todos");
  const todos = useMemo(() => snapshotCandidatos(), []);
  const filtrados =
    cargo === "todos" ? todos : todos.filter((c) => c.cargo === cargo);

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Candidatos registrados — TSE</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
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

        {filtrados.map((c) => (
          <div
            key={`${c.cargo}-${c.nome}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c.cor,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.nome}</div>
              <span className="m-muted-c" style={{ fontSize: 9.5 }}>
                {c.partido} · Nº {c.numero}
              </span>
            </div>
            <span className="w-cargo-chip">{c.uf}</span>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Candidaturas deferidas — fonte TSE (consulta_cand_2026_BRASIL.csv).
        Atualização mensal.
      </SectionLeitura>
    </div>
  );
}
