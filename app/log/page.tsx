import { headers } from "next/headers";

import { appendAccessLog, summarizeAccessLogs } from "@/lib/access-log";
import { readCadastros } from "@/lib/cadastros";

export const dynamic = "force-dynamic";

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fmtDur(ms?: number) {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m${r.toString().padStart(2, "0")}s`;
}

export default async function AccessLogPage() {
  await appendAccessLog(await headers(), {
    event: "log_page_view",
    path: "/log",
  });

  const [summary, cadastros] = await Promise.all([summarizeAccessLogs(), readCadastros()]);

  const telaoCount = cadastros.filter((c) => c.origem === "telao").length;
  const landingCount = cadastros.filter((c) => c.origem === "landing").length;
  const onboardingCount = cadastros.filter((c) => c.origem === "onboarding").length;

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Auditoria & Inteligência</p>
          <h1>Log de acessos & Usuários</h1>
          <p>
            Monitoramento em tempo real de acessos, IPs, tempo de tela e base completa de usuários
            cadastrados (Telão de Apuração, Leads de Transparência e Onboarding).
          </p>
        </div>
        <div className="log-stat-grid">
          <div className="log-stat">
            <span>Total acessos</span>
            <strong>{summary.totalAccesses}</strong>
          </div>
          <div className="log-stat">
            <span>IPs únicos</span>
            <strong>{summary.uniqueIps}</strong>
          </div>
          <div className="log-stat">
            <span>Usuários Registrados</span>
            <strong>{cadastros.length}</strong>
            <span style={{ fontSize: "10px", marginTop: "4px", color: "#a5b4fc" }}>
              {telaoCount} telão · {landingCount} landing · {onboardingCount} mobile
            </span>
          </div>
          <div className="log-stat">
            <span>Tempo médio/página</span>
            <strong>{fmtDur(summary.tempoMedioMs)}</strong>
          </div>
        </div>
      </section>

      <section className="log-panel">
        <h2>
          Usuários cadastrados & preferências ({cadastros.length})
        </h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Contato / WhatsApp</th>
                <th>Origem</th>
                <th>Preferências / Detalhes</th>
                <th>Local</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {cadastros.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum usuário cadastrado até o momento.</td>
                </tr>
              ) : (
                cadastros.map((c, i) => {
                  const rawDigits = c.whatsapp ? c.whatsapp.replace(/\D/g, "") : "";
                  const waUrl = rawDigits
                    ? `https://wa.me/${rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`}`
                    : null;
                  return (
                    <tr key={`${c.id || c.email || c.whatsapp || c.nome}-${c.at}-${i}`}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(c.at)}</td>
                      <td style={{ fontWeight: 600, color: "#fff" }}>{c.nome}</td>
                      <td>
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#86efac", textDecoration: "none" }}
                            title="Conversar no WhatsApp"
                          >
                            💬 {c.whatsapp}
                          </a>
                        ) : (
                          c.whatsapp || "—"
                        )}
                        {c.email ? (
                          <div style={{ color: "#9aa3b8", fontSize: "0.85em", marginTop: "2px" }}>
                            {c.email}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {c.origem === "telao" && (
                          <span
                            style={{
                              background: "rgba(56, 189, 248, 0.15)",
                              color: "#38bdf8",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            📺 Telão
                          </span>
                        )}
                        {c.origem === "landing" && (
                          <span
                            style={{
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            🚀 Landing
                          </span>
                        )}
                        {c.origem === "onboarding" && (
                          <span
                            style={{
                              background: "rgba(250, 204, 21, 0.15)",
                              color: "#facc15",
                              border: "1px solid rgba(250, 204, 21, 0.3)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            📱 Mobile
                          </span>
                        )}
                      </td>
                      <td>
                        {Array.isArray(c.partidos) && c.partidos.length > 0 ? (
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {c.partidos.map((p) => (
                              <span
                                key={p}
                                style={{
                                  background: "rgba(255, 255, 255, 0.08)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                }}
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : c.situacao || c.pergunta ? (
                          <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                            {c.situacao ? <span>Cargo: {c.situacao} </span> : null}
                            {c.pergunta ? <span>— &quot;{c.pergunta}&quot;</span> : null}
                          </div>
                        ) : (
                          <span style={{ color: "#64748b" }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.cidade || c.uf ? `${c.cidade || ""}${c.cidade && c.uf ? "/" : ""}${c.uf || ""}` : "—"}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8" }}>
                        {c.ip || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="log-panel">
        <h2>Tempo por página</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>Acessos</th>
                <th>Tempo médio</th>
                <th>Tempo total</th>
                <th>Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {summary.pageStats.slice(0, 60).map((p) => (
                <tr key={p.path}>
                  <td>{p.path}</td>
                  <td>{p.hits}</td>
                  <td>{p.samples > 0 ? fmtDur(p.avgMs) : "—"}</td>
                  <td>{p.samples > 0 ? fmtDur(p.totalMs) : "—"}</td>
                  <td>{formatDate(p.lastAccess)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="log-panel">
        <h2>Resumo por IP</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>Cidade</th>
                <th>UF/Região</th>
                <th>País</th>
                <th>Acessos</th>
                <th>Último acesso</th>
                <th>Último evento</th>
                <th>Último caminho</th>
              </tr>
            </thead>
            <tbody>
              {summary.entries.map((entry) => (
                <tr key={`${entry.ip}-${entry.lastAccess}`}>
                  <td>{entry.ip}</td>
                  <td>{entry.city}</td>
                  <td>{entry.region}</td>
                  <td>{entry.country}</td>
                  <td>{entry.accessCount}</td>
                  <td>{formatDate(entry.lastAccess)}</td>
                  <td>{entry.event}</td>
                  <td>{entry.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="log-panel">
        <h2>Eventos recentes</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Evento</th>
                <th>IP</th>
                <th>Cidade</th>
                <th>Caminho</th>
                <th>Tempo</th>
                <th>Origem (referrer)</th>
                <th>User agent</th>
              </tr>
            </thead>
            <tbody>
              {summary.rawLogs.slice(0, 200).map((entry, i) => (
                <tr key={`${entry.at}-${entry.ip}-${entry.event}-${i}`}>
                  <td>{formatDate(entry.at)}</td>
                  <td>{entry.event}</td>
                  <td>{entry.ip}</td>
                  <td>{entry.city}</td>
                  <td>{entry.path}</td>
                  <td>
                    {entry.event === "page_time" && typeof entry.metadata?.ms === "number"
                      ? fmtDur(entry.metadata.ms as number)
                      : "—"}
                  </td>
                  <td>{entry.referrer || "—"}</td>
                  <td>{entry.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
