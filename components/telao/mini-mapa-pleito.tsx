"use client";

import { useEffect, useState, useMemo } from "react";
import { UFS, UF_NOME, REGIAO } from "@/lib/telao/ufs";

export type CargoPleito = "presidente" | "governador" | "senador" | "deputado-federal" | "deputado-estadual";

interface UfStatus {
  pctUrnas: number;
  status: string;
  lider?: string;
  partidoLider?: string;
  vagas?: number;
}

interface MiniMapaProps {
  ufSel: string;
  onSelectUf: (uf: string) => void;
  cargoInicial?: CargoPleito;
  onClose?: () => void;
}

const REGIOES = ["Todas", "Sudeste", "Sul", "Nordeste", "Norte", "Centro-Oeste"] as const;
type RegiaoFiltro = typeof REGIOES[number];

export function MiniMapaPleito({ ufSel, onSelectUf, cargoInicial = "governador", onClose }: MiniMapaProps) {
  const [cargo, setCargo] = useState<CargoPleito>(cargoInicial);
  const [regiaoSel, setRegiaoSel] = useState<RegiaoFiltro>("Todas");
  const [andamento, setAndamento] = useState<Record<string, UfStatus>>({});
  const [hoverUf, setHoverUf] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/telao/nacional")
      .then((r) => r.json())
      .then((data) => {
        if (!ativo) return;
        const mapa: Record<string, UfStatus> = {};
        if (cargo === "governador" && data.governadores) {
          for (const g of data.governadores) {
            mapa[g.uf] = {
              pctUrnas: g.pctUrnas ?? 0,
              status: g.status ?? "aguardando",
              lider: g.cand?.[0]?.nome,
              partidoLider: g.cand?.[0]?.partido,
              vagas: g.vagas,
            };
          }
        } else if (cargo === "senador" && data.senado) {
          for (const s of data.senado) {
            mapa[s.uf] = {
              pctUrnas: s.pctUrnas ?? 0,
              status: s.status ?? "aguardando",
              lider: s.cand?.[0]?.nome,
              partidoLider: s.cand?.[0]?.partido,
              vagas: s.vagas,
            };
          }
        } else if (cargo === "deputado-federal" && data.camara?.porUF) {
          for (const c of data.camara.porUF) {
            mapa[c.uf] = {
              pctUrnas: c.pctUrnas ?? 0,
              status: (c.pctUrnas ?? 0) > 0 ? "em_apuracao" : "aguardando",
              vagas: c.vagas,
            };
          }
        } else if (cargo === "deputado-estadual" && data.assembleias?.porUF) {
          for (const a of data.assembleias.porUF) {
            mapa[a.uf] = {
              pctUrnas: a.pctUrnas ?? 0,
              status: (a.pctUrnas ?? 0) > 0 ? "em_apuracao" : "aguardando",
              vagas: a.vagas,
            };
          }
        } else {
          // Presidente ou Fallback geral
          const pctPadrao = data.pctUrnasMedia || 0;
          for (const u of UFS) {
            mapa[u] = {
              pctUrnas: pctPadrao,
              status: pctPadrao > 0 ? "em_apuracao" : "aguardando",
            };
          }
        }
        setAndamento(mapa);
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, [cargo]);

  const getColor = (pct: number) => {
    if (pct === 0) return "#334155";
    if (pct < 25) return "#0284c7";
    if (pct < 50) return "#06b6d4";
    if (pct < 85) return "#eab308";
    if (pct < 100) return "#f97316";
    return "#22c55e";
  };

  const cargos: { id: CargoPleito; rotulo: string; ico: string }[] = [
    { id: "presidente", rotulo: "Presidência", ico: "🏛️" },
    { id: "governador", rotulo: "Governador", ico: "⭐" },
    { id: "senador", rotulo: "Senador", ico: "⚖️" },
    { id: "deputado-federal", rotulo: "Dep. Federal", ico: "🇧🇷" },
    { id: "deputado-estadual", rotulo: "Dep. Estadual", ico: "📍" },
  ];

  const ufsFiltradas = useMemo(() => {
    if (regiaoSel === "Todas") return UFS;
    return UFS.filter((u) => REGIAO[u] === regiaoSel);
  }, [regiaoSel]);

  return (
    <div className="mini-mapa-box">
      {/* Cabeçalho de Controle */}
      <div className="mini-mapa-head">
        <div className="mini-mapa-titulo-wrap">
          <span className="mini-mapa-badge-live" />
          <h2 className="mini-mapa-title">ANDAMENTO DO PLEITO EM TEMPO REAL</h2>
          <span className="mini-mapa-subtitle">
            {cargo === "presidente" ? "Totalização Nacional" : "Clique em qualquer estado para abrir no telão"}
          </span>
        </div>

        <div className="mini-mapa-head-actions">
          {/* Seletor de Cargos */}
          <div className="mini-mapa-cargos" role="tablist" aria-label="Cargos do Pleito">
            {cargos.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={cargo === c.id}
                className={`mini-cargo-btn ${cargo === c.id ? "on" : ""}`}
                onClick={() => setCargo(c.id)}
              >
                <span className="mini-cargo-ico">{c.ico}</span>
                <span className="mini-cargo-txt">{c.rotulo}</span>
              </button>
            ))}
          </div>

          {onClose && (
            <button
              className="mini-mapa-close-btn"
              onClick={onClose}
              title="Fechar painel de andamento"
              aria-label="Fechar"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Barra de Filtro por Região */}
      <div className="mini-mapa-filtros-bar">
        <span className="mini-mapa-filtro-lbl">REGIÃO:</span>
        <div className="mini-mapa-regioes-pills">
          {REGIOES.map((r) => {
            const count = r === "Todas" ? 27 : UFS.filter((u) => REGIAO[u] === r).length;
            const ativa = regiaoSel === r;
            return (
              <button
                key={r}
                className={`mini-regiao-pill ${ativa ? "on" : ""}`}
                onClick={() => setRegiaoSel(r)}
              >
                {r} <span className="mini-regiao-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Legenda compacta à direita */}
        <div className="mini-mapa-legenda">
          <span><i style={{ background: "#334155" }} /> 0%</span>
          <span><i style={{ background: "#0284c7" }} /> 1-50%</span>
          <span><i style={{ background: "#eab308" }} /> 51-85%</span>
          <span><i style={{ background: "#f97316" }} /> 86-99%</span>
          <span><i style={{ background: "#22c55e" }} /> 100%</span>
        </div>
      </div>

      {/* Grid de UFs */}
      {regiaoSel === "Todas" ? (
        <div className="mini-mapa-grid-ufs">
          {ufsFiltradas.map((u) => {
            const info = andamento[u];
            const pct = info ? Math.round(info.pctUrnas) : 0;
            const isSel = ufSel === u;
            const isHov = hoverUf === u;
            const color = getColor(pct);

            return (
              <button
                key={u}
                className={`mini-uf-badge ${isSel ? "sel" : ""} ${isHov ? "hov" : ""}`}
                style={{
                  borderColor: isSel ? "#38bdf8" : isHov ? "#facc15" : "rgba(255, 255, 255, 0.12)",
                  backgroundColor: isSel
                    ? "rgba(14, 165, 233, 0.22)"
                    : isHov
                    ? "rgba(250, 204, 21, 0.14)"
                    : "rgba(15, 23, 42, 0.75)",
                  boxShadow: isSel
                    ? "0 0 14px rgba(56, 189, 248, 0.55), inset 0 0 10px rgba(56, 189, 248, 0.2)"
                    : isHov
                    ? "0 0 10px rgba(250, 204, 21, 0.4)"
                    : undefined,
                }}
                onMouseEnter={() => setHoverUf(u)}
                onMouseLeave={() => setHoverUf(null)}
                onClick={() => onSelectUf(u)}
                title={`${UF_NOME[u]} (${REGIAO[u]}): ${pct}% apurado${info?.lider ? ` · Líder: ${info.lider} (${info.partidoLider || ""})` : ""}`}
              >
                <div className="mini-uf-top">
                  <span className="mini-uf-sigla">{u.toUpperCase()}</span>
                  <span className="mini-uf-pct" style={{ color: pct > 0 ? color : "#94a3b8" }}>
                    {pct > 0 ? `${pct}%` : "—"}
                  </span>
                </div>
                {/* Mini barra de progresso */}
                <div className="mini-uf-bar">
                  <div
                    className="mini-uf-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(0, pct))}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Visualização Detalhada por Região Específica */
        <div className="mini-mapa-grid-detalhado">
          {ufsFiltradas.map((u) => {
            const info = andamento[u];
            const pct = info ? Math.round(info.pctUrnas) : 0;
            const isSel = ufSel === u;
            const isHov = hoverUf === u;
            const color = getColor(pct);

            return (
              <div
                key={u}
                className={`mini-uf-card-detalhe ${isSel ? "sel" : ""} ${isHov ? "hov" : ""}`}
                onMouseEnter={() => setHoverUf(u)}
                onMouseLeave={() => setHoverUf(null)}
                onClick={() => onSelectUf(u)}
              >
                <div className="mini-card-head">
                  <div className="mini-card-uf-info">
                    <span className="mini-card-sigla">{u.toUpperCase()}</span>
                    <div className="mini-card-nomes">
                      <span className="mini-card-nome">{UF_NOME[u]}</span>
                      <span className="mini-card-regiao">{REGIAO[u]}</span>
                    </div>
                  </div>
                  <div className="mini-card-pct-badge" style={{ borderColor: color, color }}>
                    {pct > 0 ? `${pct}% apurado` : "Aguardando 17h"}
                  </div>
                </div>

                <div className="mini-card-bar-bg">
                  <div className="mini-card-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>

                <div className="mini-card-footer">
                  {info?.lider ? (
                    <div className="mini-card-lider">
                      <span className="mini-card-lider-lbl">LÍDER:</span>
                      <span className="mini-card-lider-val">
                        {info.lider} {info.partidoLider ? `(${info.partidoLider})` : ""}
                      </span>
                    </div>
                  ) : info?.vagas ? (
                    <div className="mini-card-lider">
                      <span className="mini-card-lider-lbl">VAGAS:</span>
                      <span className="mini-card-lider-val">{info.vagas} vagas</span>
                    </div>
                  ) : (
                    <div className="mini-card-lider">
                      <span className="mini-card-lider-lbl">STATUS:</span>
                      <span className="mini-card-lider-val">Aguardando apuração</span>
                    </div>
                  )}

                  <button
                    className={`mini-card-select-btn ${isSel ? "sel" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectUf(u);
                    }}
                  >
                    {isSel ? "✓ Selecionado" : "Ver no Telão →"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
