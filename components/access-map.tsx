"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type MapPoint = {
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
  x?: number;
  y?: number;
};

type AccessMapProps = {
  entries: MapPoint[];
  totalAccesses: number;
  uniqueIps: number;
  onlineCount: number;
};

type FilterId = "all" | "online" | "stale" | "login" | "leads" | "cockpit";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "online", label: "Online" },
  { id: "stale", label: "Antigos" },
  { id: "login", label: "Login" },
  { id: "leads", label: "Leads" },
  { id: "cockpit", label: "Cockpit" },
];

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
  if (filter === "online") return point.online;
  if (filter === "stale") return !point.online;
  if (filter === "login") return point.lastEvent.startsWith("login");
  if (filter === "leads") {
    return (
      point.lastEvent.includes("lead") || point.lastEvent.includes("transparency")
    );
  }
  if (filter === "cockpit") {
    return (
      point.lastEvent.includes("cockpit") ||
      point.lastEvent.includes("section") ||
      point.lastPath === "/"
    );
  }
  return true;
}

export function AccessMap({
  entries,
  totalAccesses,
  uniqueIps,
  onlineCount,
}: AccessMapProps) {
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesFilter(entry, filter)),
    [entries, filter],
  );

  const points = useMemo(
    () =>
      filteredEntries.filter(
        (entry) => typeof entry.x === "number" && typeof entry.y === "number",
      ),
    [filteredEntries],
  );

  const maxAccessCount = useMemo(
    () => points.reduce((max, point) => Math.max(max, point.accessCount), 1),
    [points],
  );

  const hoveredPoint =
    points.find((point) => `${point.city}-${point.ip}` === hoveredPointKey) || null;
  const listedPoints = filteredEntries
    .slice()
    .sort((a, b) => b.accessCount - a.accessCount || b.lastAccess.localeCompare(a.lastAccess));

  return (
    <main className="mapa-page">
      <section className="mapa-hero">
        <div>
          <p className="mapa-kicker">Monitor de acesso em tempo real</p>
          <h1>Mapa do Brasil — verde online, vermelho antigo</h1>
          <p>
            Verde: último acesso nos últimos 5 minutos. Vermelho: acesso antigo. Passe o mouse para
            ver IP, data/hora, evento, path e agente.
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
          <div className="mapa-canvas">
            <div className="mapa-map-stage">
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
                const key = `${point.city}-${point.ip}`;

                return (
                  <button
                    key={key}
                    className={`mapa-marker ${point.online ? "mapa-marker--online" : "mapa-marker--stale"} ${hoveredPointKey === key ? "active" : ""}`}
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
            </div>

            {hoveredPoint ? (
              <div
                className="mapa-tooltip"
                style={{
                  left: `calc(${hoveredPoint.x}% + 18px)`,
                  top: `calc(${hoveredPoint.y}% - 12px)`,
                }}
              >
                <strong>
                  {hoveredPoint.city} · {hoveredPoint.online ? "ONLINE" : "ANTIGO"}
                </strong>
                <span>IP: {hoveredPoint.ip}</span>
                <span>Data: {formatDate(hoveredPoint.lastAccess)}</span>
                <span>Evento: {hoveredPoint.lastEvent}</span>
                <span>Path: {hoveredPoint.lastPath}</span>
                <span>Ator: {hoveredPoint.actor}</span>
                <span>
                  Local: {hoveredPoint.localPorIp} · {hoveredPoint.country}
                </span>
                <span>UA: {hoveredPoint.userAgentShort}</span>
                <span>Acessos: {hoveredPoint.accessCount}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mapa-side-card">
          <h2>Todos os IPs ({listedPoints.length})</h2>
          <div className="mapa-side-list">
            {listedPoints.map((point) => (
              <article
                className={`mapa-side-item ${point.online ? "mapa-side-item--online" : "mapa-side-item--stale"}`}
                key={`${point.city}-${point.ip}`}
              >
                <div className="mapa-side-top">
                  <strong>{point.city}</strong>
                  <span>{point.online ? "ONLINE" : "ANTIGO"}</span>
                </div>
                <p>IP: {point.ip}</p>
                <p>Ator: {point.actor}</p>
                <p>Evento: {point.lastEvent}</p>
                <p>Path: {point.lastPath}</p>
                <p>Acessos: {point.accessCount}</p>
                <p>Ultimo acesso: {formatDate(point.lastAccess)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
