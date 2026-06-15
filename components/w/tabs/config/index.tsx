"use client";

import { useState } from "react";

import { SectionLeitura } from "@/components/mobile/ui/section-leitura";

const CARGOS_CONFIG = [
  { id: "presidente", label: "Presidente" },
  { id: "governador_rj", label: "Governador RJ" },
  { id: "senador_rj", label: "Senador RJ" },
  { id: "dep_federal_rj", label: "Dep. Federal RJ" },
];

export default function ConfigWTab() {
  const [janela, setJanela] = useState(30);
  const [ativos, setAtivos] = useState<Set<string>>(
    () => new Set(CARGOS_CONFIG.map((c) => c.id)),
  );

  function toggleCargo(id: string) {
    setAtivos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="m-tab-content">
      <div className="m-card">
        <div className="m-card-head">
          <span className="m-card-title">Configurações</span>
        </div>

        <div style={{ padding: "12px 0" }}>
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8, fontWeight: 700 }}>
            Cargos monitorados
          </div>
          {CARGOS_CONFIG.map((c) => (
            <label
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 0",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={ativos.has(c.id)}
                onChange={() => toggleCargo(c.id)}
                style={{ accentColor: "var(--w-accent, #2563eb)", width: 16, height: 16 }}
              />
              {c.label}
            </label>
          ))}
        </div>

        <div
          style={{
            padding: "12px 0",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="m-muted-c" style={{ fontSize: 11, marginBottom: 8, fontWeight: 700 }}>
            Janela do agregador
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="range"
              min={14}
              max={60}
              value={janela}
              onChange={(e) => setJanela(Number(e.target.value))}
              style={{ flex: 1, accentColor: "var(--w-accent, #2563eb)" }}
            />
            <span className="m-mono" style={{ fontSize: 14, fontWeight: 700, minWidth: 50 }}>
              {janela} dias
            </span>
          </div>
          <div className="m-muted-c" style={{ fontSize: 9.5, marginTop: 6 }}>
            14d = mais sensível a pesquisas recentes · 60d = mais estável (padrão Poder360)
          </div>
        </div>
      </div>

      <div className="m-card" style={{ marginTop: 12 }}>
        <div className="m-card-head">
          <span className="m-card-title">Fontes de dados</span>
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--m-muted)" }}>
          <div style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <strong style={{ color: "#e8ecf4" }}>Pesquisas</strong> — PesqEle TSE (CSV diário)
          </div>
          <div style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <strong style={{ color: "#e8ecf4" }}>Candidatos</strong> — TSE (consulta_cand_2026)
          </div>
          <div style={{ padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <strong style={{ color: "#e8ecf4" }}>Imprensa</strong> — Google News RSS
          </div>
          <div style={{ padding: "5px 0" }}>
            <strong style={{ color: "#e8ecf4" }}>Apuração</strong> — resultados.tse.jus.br (JSON)
          </div>
        </div>
      </div>

      <SectionLeitura>
        Configurações do cockpit eleitoral. As preferências são locais (localStorage).
      </SectionLeitura>
    </div>
  );
}
