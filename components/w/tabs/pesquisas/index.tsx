"use client";

import { useMemo, useState } from "react";

import { FonteBadge } from "@/components/mobile/ui/fonte-badge";
import { SectionLeitura } from "@/components/mobile/ui/section-leitura";
import { snapshotPesquisas } from "@/lib/w/w-mock";

const _LOAD_NOW = Date.now();

export default function PesquisasWTab() {
  const pesquisas = useMemo(() => snapshotPesquisas(_LOAD_NOW), []);
  const [inst, setInst] = useState<string>("todos");

  const institutos = useMemo(
    () => ["todos", ...Array.from(new Set(pesquisas.map((p) => p.instituto)))],
    [pesquisas],
  );

  const filtradas = inst === "todos" ? pesquisas : pesquisas.filter((p) => p.instituto === inst);
  const presidente = filtradas.filter((p) => p.cargo === "presidente");

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Pesquisas — Presidente</span>
          <FonteBadge real={false} />
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {institutos.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInst(i)}
              className={`m-pill ${inst === i ? "up" : ""}`}
              style={{ fontSize: 10 }}
            >
              {i}
            </button>
          ))}
        </div>

        {presidente.slice(0, 20).map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div>
              <span className="m-muted-c" style={{ fontSize: 9.5 }}>
                {p.instituto} · {p.dataRegistro} · n={p.n.toLocaleString("pt-BR")}
              </span>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.candidato}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="m-mono" style={{ fontSize: 16, fontWeight: 800 }}>
                {p.pct}%
              </span>
              <div className="m-muted-c" style={{ fontSize: 9 }}>±{p.margemErro}pp</div>
            </div>
          </div>
        ))}
      </div>
      <SectionLeitura>
        Dados do PesqEle (TSE) — download diário CSV. Média móvel 30d ponderada por n amostral e
        recência.
      </SectionLeitura>
    </div>
  );
}
