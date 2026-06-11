"use client";

import { useMemo, useState } from "react";

import { HoverPost, useHoverPost } from "@/components/hover-post";
import watchlist from "@/data/watchlist.json";
import {
  ATIVACAO,
  INFLUENCERS,
  getInfluencerPost,
  type Influencer,
} from "@/lib/mock/influencers";

type Modo = "seguidores" | "engajamento";

function fmtK(thousands: number): string {
  return thousands >= 1000
    ? `${(thousands / 1000).toFixed(1)}M`
    : `${thousands}k`;
}

const RISCO_BADGE: Record<string, string> = {
  baixo: "badge-real",
  médio: "badge-amarelo",
  alto: "badge-vermelho",
};

export function InfluenciadoresSection() {
  const [modo, setModo] = useState<Modo>("seguidores");
  const { hover, show, hide } = useHoverPost();

  const ranking = useMemo(
    () =>
      [...INFLUENCERS].sort((a, b) =>
        modo === "engajamento"
          ? b.engajamento - a.engajamento
          : b.seguidores - a.seguidores,
      ),
    [modo],
  );

  const audiencia = INFLUENCERS.reduce((s, i) => s + i.seguidores, 0);
  const engMedio = (
    INFLUENCERS.reduce((s, i) => s + i.engajamento, 0) / INFLUENCERS.length
  ).toFixed(2);

  const hoverItem = (inf: Influencer) => ({
    titulo: inf.handle,
    subtitulo: inf.regiao,
    cor: "#e1306c",
    post: getInfluencerPost(inf),
  });

  return (
    <div className="section active">
      <div className="region-banner">
        <i data-lucide="users-round" /> <strong>Influenciadores Locais</strong>{" "}
        · Costa Verde
        <span className="card-badge badge-cinza" style={{ marginLeft: 8 }}>
          @handles reais
        </span>
      </div>

      <div className="kpi-row" style={{ marginTop: 8 }}>
        <div className="kpi-card">
          <div className="kpi-label">Perfis mapeados</div>
          <div className="kpi-value" style={{ color: "#e1306c" }}>
            {INFLUENCERS.length}
          </div>
          <div className="kpi-sub">Instagram</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Audiência potencial</div>
          <div className="kpi-value" style={{ color: "#60a5fa" }}>
            {fmtK(audiencia)}
          </div>
          <div className="kpi-sub up">somados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Engajamento médio</div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>
            {engMedio}%
          </div>
          <div className="kpi-sub">por post</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Territórios ativos</div>
          <div className="kpi-value" style={{ color: "#f0c030" }}>
            {ATIVACAO.length}
          </div>
          <div className="kpi-sub">mapa de ativação</div>
        </div>
      </div>

      <div className="modo-toggle" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`modo-btn ${modo === "seguidores" ? "active" : ""}`}
          onClick={() => setModo("seguidores")}
        >
          Por Seguidores
        </button>
        <button
          type="button"
          className={`modo-btn ${modo === "engajamento" ? "active" : ""}`}
          onClick={() => setModo("engajamento")}
        >
          Por Engajamento
        </button>
        <span className="modo-hint">passe o mouse para ver o último post</span>
      </div>

      <div className="grid-7-5" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Ranking de Influenciadores</div>
            <span className="card-badge badge-real">{INFLUENCERS.length}</span>
          </div>
          <div className="fig-list">
            {ranking.map((inf, i) => {
              const hi = hoverItem(inf);
              return (
                <div
                  className="fig-row hoverable"
                  key={inf.handle}
                  onMouseEnter={(e) => show(hi, e)}
                  onMouseMove={(e) => show(hi, e)}
                  onMouseLeave={hide}
                  onTouchStart={(e) =>
                    show(hi, {
                      clientX: e.touches[0].clientX,
                      clientY: e.touches[0].clientY,
                    })
                  }
                >
                  <span className="fig-pos">{i + 1}</span>
                  <span
                    className="fig-avatar"
                    style={{ background: "#e1306c" }}
                  >
                    {inf.handle.replace("@", "").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="fig-name">
                    {inf.handle}
                    <small>{inf.nicho}</small>
                  </span>
                  <span className="fig-foll">
                    {modo === "engajamento"
                      ? `${inf.engajamento}%`
                      : fmtK(inf.seguidores)}
                  </span>
                  <span className="fig-growth" style={{ color: "#8a8aaa" }}>
                    {inf.regiao.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Mapa de Ativação por Território</div>
            <span className="card-badge badge-est">campo</span>
          </div>
          <div className="detail-list">
            {ATIVACAO.map((a) => (
              <div className="detail-row" key={a.territorio}>
                <span>{a.territorio}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#e1306c", fontWeight: 600 }}>
                    {a.handle}
                  </span>
                  <span className={`card-badge ${RISCO_BADGE[a.risco]}`}>
                    risco {a.risco}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ecossistema evangélico — espelho do equalizador da aba Rio do /m.
          Fonte: data/watchlist.json (edição em runtime reflete no /m na hora;
          aqui, no próximo build). */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <div className="card-title">Ecossistema Evangélico · RJ</div>
          <span className="card-badge badge-real">
            {watchlist.ecossistema_evangelico.length} entidades · base do candidato
          </span>
        </div>
        <div className="detail-list">
          {watchlist.ecossistema_evangelico.map((e) => (
            <div className="detail-row" key={e.id}>
              <span>
                {e.nome}
                <small style={{ color: "var(--texto-sec)", marginLeft: 6 }}>
                  {e.tipo}
                </small>
              </span>
              <span style={{ color: "var(--branco)", fontWeight: 700 }}>
                {e.alcance.toLocaleString("pt-BR")}k alcance
              </span>
            </div>
          ))}
        </div>
      </div>

      <HoverPost hover={hover} />
    </div>
  );
}
