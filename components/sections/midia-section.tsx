"use client";

import { useMemo, useState } from "react";

import { HoverPost, useHoverPost } from "@/components/hover-post";
import { EChart } from "@/components/echart";
import { donutOption } from "@/components/echart-options";
import {
  MATERIAS,
  MUNICAO,
  getMateriaPost,
  sentimentoColor,
  type Materia,
  type Sentimento,
} from "@/lib/mock/media";

const SENTS: (Sentimento | "Todos")[] = [
  "Todos",
  "Favorável",
  "Neutro",
  "Crítico",
];

export function MidiaSection() {
  const [filtro, setFiltro] = useState<Sentimento | "Todos">("Todos");
  const { hover, show, hide } = useHoverPost();

  const lista = useMemo(
    () => MATERIAS.filter((m) => filtro === "Todos" || m.sentimento === filtro),
    [filtro],
  );

  const conta = (s: Sentimento) =>
    MATERIAS.filter((m) => m.sentimento === s).length;
  const donut = useMemo(
    () =>
      donutOption(
        ["Favorável", "Neutro", "Crítico"],
        [conta("Favorável"), conta("Neutro"), conta("Crítico")],
        ["#22c55e", "#8a8aaa", "#ef4444"],
      ),
    [],
  );

  const hi = (m: Materia) => ({
    titulo: m.veiculo,
    subtitulo: m.data,
    cor: sentimentoColor(m.sentimento),
    post: getMateriaPost(m),
  });

  return (
    <div className="section active">
      <div className="region-banner">
        <i data-lucide="radio-tower" /> <strong>Mídia & Imprensa</strong>
        <span className="card-badge badge-cinza" style={{ marginLeft: 8 }}>
          matérias reais
        </span>
      </div>

      <div className="kpi-row" style={{ marginTop: 8 }}>
        <div className="kpi-card">
          <div className="kpi-label">Matérias monitoradas</div>
          <div className="kpi-value" style={{ color: "#60a5fa" }}>
            {MATERIAS.length}
          </div>
          <div className="kpi-sub">veículos reais</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Favoráveis</div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>
            {conta("Favorável")}
          </div>
          <div className="kpi-sub up">tom positivo</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Neutras</div>
          <div className="kpi-value" style={{ color: "#8a8aaa" }}>
            {conta("Neutro")}
          </div>
          <div className="kpi-sub">informativas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Críticas</div>
          <div className="kpi-value" style={{ color: "#ef4444" }}>
            {conta("Crítico")}
          </div>
          <div className="kpi-sub down">atenção</div>
        </div>
      </div>

      <div className="chip-row" style={{ marginTop: 12 }}>
        {SENTS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${filtro === s ? "active" : ""}`}
            onClick={() => setFiltro(s)}
          >
            {s}
          </button>
        ))}
        <span className="modo-hint">
          passe o mouse na matéria para o resumo
        </span>
      </div>

      <div className="grid-7-5" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Clipping — {filtro}</div>
            <span className="card-badge badge-real">{lista.length}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Matéria</th>
                  <th>Veículo</th>
                  <th>Tom</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr
                    key={m.link}
                    className="hoverable"
                    onMouseEnter={(e) => show(hi(m), e)}
                    onMouseMove={(e) => show(hi(m), e)}
                    onMouseLeave={hide}
                    onTouchStart={(e) =>
                      show(hi(m), {
                        clientX: e.touches[0].clientX,
                        clientY: e.touches[0].clientY,
                      })
                    }
                  >
                    <td>{m.data}</td>
                    <td>
                      <a
                        href={m.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--branco)" }}
                      >
                        {m.titulo}
                      </a>
                    </td>
                    <td>{m.veiculo}</td>
                    <td>
                      <span
                        className="card-badge"
                        style={{
                          color: sentimentoColor(m.sentimento),
                          borderColor: sentimentoColor(m.sentimento) + "55",
                          border: "1px solid",
                        }}
                      >
                        {m.sentimento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tom da Cobertura</div>
            <span className="card-badge badge-azul">distribuição</span>
          </div>
          <EChart option={donut} height={260} />
        </div>
      </div>

      {/* Munição — espelho da coluna da aba Radar do /m */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <div className="card-title">
            Munição — matérias negativas sobre o governo (24h)
          </div>
          <span className="card-badge badge-real">
            ranqueado por alcance
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Matéria</th>
                <th>Veículo</th>
                <th>Alcance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...MUNICAO]
                .sort((a, b) => (b.alcance ?? 0) - (a.alcance ?? 0))
                .map((m) => (
                  <tr key={m.titulo}>
                    <td>{m.titulo}</td>
                    <td>{m.veiculo}</td>
                    <td>{(m.alcance ?? 0).toLocaleString("pt-BR")}k</td>
                    <td>
                      <button
                        type="button"
                        className="btn-top"
                        onClick={() =>
                          navigator.clipboard
                            ?.writeText(`${m.titulo} — ${m.veiculo}`)
                            .catch(() => undefined)
                        }
                      >
                        copiar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <HoverPost hover={hover} />
    </div>
  );
}
