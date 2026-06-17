"use client";

import { useEffect, useMemo, useState } from "react";

import { EChart } from "@/components/echart";
import { RegionDrillMap } from "@/components/charts/region-drill-map";
import {
  barOption,
  funnelOption,
  gaugeOption,
  lineOption,
  orgTreeOption,
} from "@/components/echart-options";
import {
  LEVELS,
  LEVEL_AVATAR,
  getActivityFeed,
  getCadastroEvolution,
  getOrgAggregates,
  getOrgTree,
  getOrganizers,
  getTierPerformanceSeries,
  getTierSummary,
  type OrganizerLevel,
} from "@/lib/mock/organizers";
import { RedeCadastro } from "@/components/sections/rede-cadastro";
import { getPresidentialByState } from "@/lib/mock/races";
import { getRegion } from "@/lib/mock/rj-regions";
import type { RegionId } from "@/lib/mock/types";

const nf = (n: number) => n.toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const STATUS_BADGE: Record<string, string> = {
  ativo: "badge-real",
  atencao: "badge-amarelo",
  inativo: "badge-cinza",
};

export function OrganizadoresSection({
  region,
  onRegionChange,
}: {
  region: RegionId;
  onRegionChange: (id: RegionId) => void;
}) {
  const nomeRegiao = getRegion(region)?.nome ?? "Todo o RJ";
  const [tick, setTick] = useState(0);
  const [filtro, setFiltro] = useState<OrganizerLevel | "todos">("todos");

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const agg = useMemo(() => getOrgAggregates(region), [region]);
  const tiers = useMemo(() => getTierSummary(region), [region]);
  const leaders = useMemo(() => getOrganizers(region), [region]);
  const feed = useMemo(() => getActivityFeed(region), [region]);
  const treeOpt = useMemo(() => orgTreeOption(getOrgTree(region)), [region]);
  const tierBarOpt = useMemo(
    () => barOption(getTierPerformanceSeries(region)),
    [region],
  );
  const evoOpt = useMemo(
    () => lineOption(getCadastroEvolution(region), { area: true }),
    [region],
  );
  const brasil = useMemo(() => getPresidentialByState(), []);

  const meta = agg.metas.lista;
  const atual = agg.metas.atual;
  const totalLideres = tiers.reduce((s, t) => s + t.lideres, 0);
  const contatosHoje = tiers.reduce((s, t) => s + t.contatosHoje, 0);

  // Oscilação "ao vivo".
  const wave = Math.sin(tick / 1.6);
  const cadastrosVivo = atual.cadastro + Math.round(tick * 1.4 + wave * 3);
  const engajadosVivo = atual.engajado + Math.round(tick * 0.9 + wave * 2);

  const funnelOpt = useMemo(
    () =>
      funnelOption([
        { name: "Lista", value: atual.lista },
        { name: "Cadastro", value: atual.cadastro },
        { name: "Engajado (QR)", value: atual.engajado },
      ]),
    [atual.lista, atual.cadastro, atual.engajado],
  );

  const filtered = leaders.filter(
    (l) => filtro === "todos" || l.nivel === filtro,
  );

  return (
    <div className="section active">
      <div className="region-banner">
        <i data-lucide="git-fork" /> <strong>Organizadores de Eleitores</strong>{" "}
        · {nomeRegiao}
        <span className="card-badge badge-real" style={{ marginLeft: 8 }}>
          <span className="dot-live" /> tempo real
        </span>
      </div>

      {/* KPIs ao vivo */}
      <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">Líderes (3 níveis)</div>
          <div className="kpi-value" style={{ color: "#8b5cf6" }}>
            {totalLideres}
          </div>
          <div className="kpi-sub">igreja · gerentes · deputados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cadastros (vivo)</div>
          <div className="kpi-value" style={{ color: "#22c55e" }}>
            {nf(cadastrosVivo)}
          </div>
          <div className="kpi-sub up">
            ▲ {pct(atual.cadastro, meta.cadastro)}% da meta
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Engajados (QR)</div>
          <div className="kpi-value" style={{ color: "#60a5fa" }}>
            {nf(engajadosVivo)}
          </div>
          <div className="kpi-sub up">▲ atualizando…</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Contatos hoje</div>
          <div className="kpi-value" style={{ color: "#f0c030" }}>
            {nf(contatosHoje + tick)}
          </div>
          <div className="kpi-sub">rede em campo</div>
        </div>
      </div>

      {/* Cards de tier com avatar */}
      <div className="grid3" style={{ marginTop: 12 }}>
        {tiers.map((t) => (
          <div className="card" key={t.nivel}>
            <div className="org-tier-head">
              <span className="org-avatar">
                <img src={t.avatar} alt={t.nome} loading="lazy" />
              </span>
              <div>
                <div className="org-tier-name">{t.plural}</div>
                <div className="org-tier-sub">
                  {t.lideres} líderes · {nf(t.cabos)} cabos · {nf(t.eleitores)}{" "}
                  eleitores
                </div>
              </div>
            </div>
            <div className="detail-list">
              <div className="detail-row">
                <span>Meta de cadastro</span>
                <span style={{ color: "var(--branco)", fontWeight: 700 }}>
                  {t.cadastroPct}%
                </span>
              </div>
              <div className="mini-bar-bg" style={{ margin: "4px 0 8px" }}>
                <div
                  className="mini-bar-fill"
                  style={{
                    width: `${t.cadastroPct}%`,
                    background: t.cor,
                    height: 6,
                  }}
                />
              </div>
              <div className="detail-row">
                <span>Engajados (QR)</span>
                <span style={{ color: "var(--branco)", fontWeight: 600 }}>
                  {t.engajadoPct}%
                </span>
              </div>
              <div className="detail-row">
                <span>Conversão</span>
                <span style={{ color: "var(--branco)", fontWeight: 600 }}>
                  {t.conversao}%
                </span>
              </div>
              <div className="detail-row">
                <span>Destaque</span>
                <span style={{ color: t.cor, fontWeight: 600 }}>
                  {t.topPerformer}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid-7-5" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Evolução de Cadastros — 8 semanas</div>
            <span className="card-badge badge-real">ao vivo</span>
          </div>
          <EChart option={evoOpt} height={250} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cadastro por Nível</div>
            <span className="card-badge badge-azul">%</span>
          </div>
          <EChart option={tierBarOpt} height={250} />
        </div>
      </div>

      <div className="grid3" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Funil Lista → Cadastro → Engajado</div>
            <span className="card-badge badge-est">rede</span>
          </div>
          <EChart option={funnelOpt} height={230} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Progresso de Cadastro</div>
            <span className="card-badge badge-real">
              {pct(atual.cadastro, meta.cadastro)}%
            </span>
          </div>
          <EChart
            option={gaugeOption(
              pct(atual.cadastro, meta.cadastro),
              "cadastro",
              "#22c55e",
            )}
            height={230}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Atividade ao Vivo</div>
            <span className="card-badge badge-real">
              <span className="dot-live" /> feed
            </span>
          </div>
          <div className="org-live-feed">
            {feed.map((f, i) => (
              <div
                className="org-feed-item"
                key={`${f.nome}-${i}`}
                style={{ borderLeftColor: f.cor }}
              >
                <div style={{ flex: 1 }}>
                  <strong style={{ color: "var(--branco)" }}>{f.nome}</strong>{" "}
                  {f.acao}
                </div>
                <span className="org-feed-time">
                  {f.minutosAtras <= 1 ? "agora" : `${f.minutosAtras}min`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Organograma + Mapa de cobertura */}
      <div className="grid-7-5" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Organograma da Rede</div>
            <span className="card-badge badge-est">clique p/ expandir</span>
          </div>
          <EChart option={treeOpt} height={340} />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Cobertura — Brasil ▸ Regiões RJ</div>
            <span className="card-badge badge-est">drill-down</span>
          </div>
          <RegionDrillMap
            brasil={brasil}
            onRegionChange={onRegionChange}
            height={300}
          />
        </div>
      </div>

      {/* Controle: ranking com filtro */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <div className="card-title">Controle de Líderes</div>
          <div className="chip-row">
            <button
              type="button"
              className={`chip ${filtro === "todos" ? "active" : ""}`}
              onClick={() => setFiltro("todos")}
            >
              Todos
            </button>
            {LEVELS.slice(0, 3).map((lv) => (
              <button
                key={lv.id}
                type="button"
                className={`chip ${filtro === lv.id ? "active" : ""}`}
                style={
                  filtro === lv.id
                    ? { borderColor: lv.cor, color: lv.cor }
                    : undefined
                }
                onClick={() => setFiltro(lv.id)}
              >
                <span className="chip-dot" style={{ background: lv.cor }} />{" "}
                {lv.nome}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Líder</th>
                <th>Nível</th>
                <th>Cabos</th>
                <th>Eleitores</th>
                <th>Cadastro</th>
                <th>Engajado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const lv = LEVELS.find((x) => x.id === l.nivel)!;
                return (
                  <tr key={l.id}>
                    <td>
                      <span
                        className="org-avatar"
                        style={{
                          width: 26,
                          height: 26,
                          display: "inline-block",
                          verticalAlign: "middle",
                          marginRight: 7,
                        }}
                      >
                        <img
                          src={LEVEL_AVATAR[l.nivel]}
                          alt=""
                          loading="lazy"
                        />
                      </span>
                      {l.nome}
                    </td>
                    <td>
                      <span style={{ color: lv.cor }}>{lv.nome}</span>
                    </td>
                    <td>{l.cabos}</td>
                    <td>{nf(l.eleitores)}</td>
                    <td>{pct(l.atual.cadastro, l.meta.cadastro)}%</td>
                    <td>{pct(l.atual.engajado, l.meta.engajado)}%</td>
                    <td>
                      <span className={`card-badge ${STATUS_BADGE[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cadastro REAL da rede (persistido) + cobrança por IA via WhatsApp */}
      <RedeCadastro />
    </div>
  );
}
