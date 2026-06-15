"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type MapPoint = {
  key: string;
  kind: "access" | "cadastro";
  accessCount: number;
  actor: string;
  city: string;
  country: string;
  ip: string;
  lastAccess: string;
  lastEvent: string;
  lastPath: string;
  localCitado: string;
  localPorIp: string;
  mapped: boolean;
  online: boolean;
  region: string;
  userAgentShort: string;
  note?: string;
  x?: number;
  y?: number;
};

type AccessMapProps = {
  entries: MapPoint[];
  totalAccesses: number;
  uniqueIps: number;
  onlineCount: number;
};

type FilterId =
  | "all"
  | "online"
  | "stale"
  | "login"
  | "leads"
  | "cadastros"
  | "cockpit"
  | "mobile";

type SortId =
  | "access_desc"
  | "access_asc"
  | "recent"
  | "oldest"
  | "city_asc"
  | "ip_asc";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "online", label: "Online" },
  { id: "stale", label: "Antigos" },
  { id: "login", label: "Login" },
  { id: "leads", label: "Leads" },
  { id: "cadastros", label: "Cadastros" },
  { id: "cockpit", label: "Web" },
  { id: "mobile", label: "Mobile /m" },
];

const SORTS: { id: SortId; label: string }[] = [
  { id: "access_desc", label: "Mais acessos" },
  { id: "access_asc", label: "Menos acessos" },
  { id: "recent", label: "Mais recentes" },
  { id: "oldest", label: "Mais antigos" },
  { id: "city_asc", label: "Cidade A–Z" },
  { id: "ip_asc", label: "IP" },
];

const ZOOM_MIN = 0.75;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function markerSize(accessCount: number, maxAccessCount: number) {
  const ratio = maxAccessCount <= 1 ? 0.4 : accessCount / maxAccessCount;
  return 14 + ratio * 26;
}

function matchesFilter(point: MapPoint, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "cadastros") return point.kind === "cadastro";
  if (filter === "online") return point.online;
  if (filter === "stale") return !point.online;
  if (filter === "login") return point.lastEvent.startsWith("login");
  if (filter === "leads") {
    return (
      point.lastEvent.includes("lead") || point.lastEvent.includes("transparency")
    );
  }
  if (filter === "mobile") {
    return (
      point.lastPath.startsWith("/m") || point.lastEvent.startsWith("mobile")
    );
  }
  if (filter === "cockpit") {
    return (
      point.lastEvent.includes("cockpit") ||
      point.lastEvent.includes("section") ||
      point.lastPath === "/" ||
      point.lastPath.startsWith("/#")
    );
  }
  return true;
}

function sortPoints(entries: MapPoint[], sort: SortId): MapPoint[] {
  const out = [...entries];
  switch (sort) {
    case "access_desc":
      return out.sort(
        (a, b) =>
          b.accessCount - a.accessCount || b.lastAccess.localeCompare(a.lastAccess),
      );
    case "access_asc":
      return out.sort(
        (a, b) =>
          a.accessCount - b.accessCount || a.lastAccess.localeCompare(b.lastAccess),
      );
    case "recent":
      return out.sort((a, b) => b.lastAccess.localeCompare(a.lastAccess));
    case "oldest":
      return out.sort((a, b) => a.lastAccess.localeCompare(b.lastAccess));
    case "city_asc":
      return out.sort((a, b) => a.city.localeCompare(b.city, "pt-BR"));
    case "ip_asc":
      return out.sort((a, b) => a.ip.localeCompare(b.ip));
    default:
      return out;
  }
}

export function AccessMap({
  entries,
  totalAccesses,
  uniqueIps,
  onlineCount,
}: AccessMapProps) {
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [sort, setSort] = useState<SortId>("access_desc");
  const [zoom, setZoom] = useState(1);

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesFilter(entry, filter)),
    [entries, filter],
  );

  const sortedEntries = useMemo(
    () => sortPoints(filteredEntries, sort),
    [filteredEntries, sort],
  );

  const points = useMemo(
    () =>
      sortedEntries.filter(
        (entry) => typeof entry.x === "number" && typeof entry.y === "number",
      ),
    [sortedEntries],
  );

  const maxAccessCount = useMemo(
    () => points.reduce((max, point) => Math.max(max, point.accessCount), 1),
    [points],
  );

  const hoveredPoint =
    points.find((point) => point.key === hoveredPointKey) || null;

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));

  return (
    <main className="mapa-page">
      <section className="mapa-hero">
        <div>
          <p className="mapa-kicker">Monitor de acesso em tempo real</p>
          <h1>Mapa do Brasil — verde online, vermelho antigo</h1>
          <p>
            Verde: último acesso nos últimos 5 minutos. Vermelho: acesso antigo.
            Azul: cadastros do onboarding /m. Inclui web, mobile /m, login e leads.
          </p>
        </div>
        <div className="mapa-stat-grid">
          <div className="mapa-stat-card">
            <span>Total de acessos</span>
            <strong>{totalAccesses}</strong>
          </div>
          <div className="mapa-stat-card">
            <span>IPs unicos</span>
            <strong>{uniqueIps}</strong>
          </div>
          <div className="mapa-stat-card">
            <span>Online agora</span>
            <strong>{onlineCount}</strong>
          </div>
        </div>
      </section>

      <section className="mapa-layout">
        <div className="mapa-canvas-card">
          <div className="mapa-toolbar">
            <div className="mapa-filter-bar">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mapa-filter-btn ${filter === item.id ? "active" : ""}`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mapa-zoom-bar">
              <button type="button" className="mapa-zoom-btn" onClick={zoomOut} aria-label="Diminuir zoom">
                −
              </button>
              <span className="mapa-zoom-label">{Math.round(zoom * 100)}%</span>
              <button type="button" className="mapa-zoom-btn" onClick={zoomIn} aria-label="Aumentar zoom">
                +
              </button>
              <button
                type="button"
                className="mapa-zoom-btn mapa-zoom-reset"
                onClick={() => setZoom(1)}
              >
                Reset
              </button>
            </div>
          </div>
          <div className={`mapa-canvas ${zoom > 1 ? "mapa-canvas--scroll" : ""}`}>
            <div className="mapa-map-scroller">
              <div
                className="mapa-map-stage"
                style={{ transform: `translate(-50%, -50%) scale(${zoom})` }}
              >
                <Image
                  className="mapa-brazil"
                  src="/brazil-map.svg"
                  alt="Mapa do Brasil por estados"
                  width={613}
                  height={639}
                  priority
                />

                {points.map((point) => {
                  const size = markerSize(point.accessCount, maxAccessCount);
                  const key = point.key;
                  const markerKind =
                    point.kind === "cadastro"
                      ? "mapa-marker--cadastro"
                      : point.online
                        ? "mapa-marker--online"
                        : "mapa-marker--stale";

                  return (
                    <button
                      key={key}
                      className={`mapa-marker ${markerKind} ${hoveredPointKey === key ? "active" : ""}`}
                      type="button"
                      style={{
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                        width: `${size}px`,
                        height: `${size}px`,
                      }}
                      onMouseEnter={() => setHoveredPointKey(key)}
                      onMouseLeave={() => setHoveredPointKey(null)}
                      onFocus={() => setHoveredPointKey(key)}
                      onBlur={() => setHoveredPointKey(null)}
                      aria-label={`${point.city}, ${point.actor}, ${point.online ? "online" : "antigo"}`}
                    >
                      <span className="mapa-marker-core" />
                    </button>
                  );
                })}

                {hoveredPoint ? (
                  <div
                    className="mapa-tooltip"
                    style={{
                      left: `calc(${hoveredPoint.x}% + 18px)`,
                      top: `calc(${hoveredPoint.y}% - 12px)`,
                    }}
                  >
                    <strong>
                      {hoveredPoint.city} ·{" "}
                      {hoveredPoint.kind === "cadastro"
                        ? "CADASTRO"
                        : hoveredPoint.online
                          ? "ONLINE"
                          : "ANTIGO"}
                    </strong>
                    <span>IP: {hoveredPoint.ip}</span>
                    <span>Data: {formatDate(hoveredPoint.lastAccess)}</span>
                    <span>Evento: {hoveredPoint.lastEvent}</span>
                    <span>Path: {hoveredPoint.lastPath}</span>
                    <span>Ator: {hoveredPoint.actor}</span>
                    <span>
                      Local: {hoveredPoint.localPorIp} · {hoveredPoint.country}
                    </span>
                    <span>
                      {hoveredPoint.kind === "cadastro" ? "Contato" : "UA"}:{" "}
                      {hoveredPoint.userAgentShort}
                    </span>
                    {hoveredPoint.note ? (
                      <span>Pergunta: {hoveredPoint.note}</span>
                    ) : null}
                    {hoveredPoint.kind === "cadastro" ? null : (
                      <span>Acessos: {hoveredPoint.accessCount}</span>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mapa-side-card">
          <div className="mapa-side-head">
            <h2>IPs ({sortedEntries.length})</h2>
            <label className="mapa-sort">
              <span>Ordenar</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                aria-label="Ordenar lista de IPs"
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mapa-side-list">
            {sortedEntries.map((point) => (
              <article
                className={`mapa-side-item ${point.kind === "cadastro" ? "mapa-side-item--cadastro" : point.online ? "mapa-side-item--online" : "mapa-side-item--stale"}`}
                key={point.key}
              >
                <div className="mapa-side-top">
                  <strong>{point.city}</strong>
                  <span>
                    {point.kind === "cadastro"
                      ? "CADASTRO"
                      : point.online
                        ? "ONLINE"
                        : "ANTIGO"}
                  </span>
                </div>
                <p>IP: {point.ip}</p>
                <p>Ator: {point.actor}</p>
                <p>Evento: {point.lastEvent}</p>
                <p>
                  {point.kind === "cadastro" ? "Contato" : "Path"}:{" "}
                  {point.kind === "cadastro"
                    ? point.userAgentShort
                    : point.lastPath}
                </p>
                {point.kind === "cadastro" ? (
                  point.note ? (
                    <p>Pergunta: {point.note}</p>
                  ) : null
                ) : (
                  <p>Acessos: {point.accessCount}</p>
                )}
                <p>
                  {point.kind === "cadastro" ? "Cadastrado em" : "Ultimo acesso"}:{" "}
                  {formatDate(point.lastAccess)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
