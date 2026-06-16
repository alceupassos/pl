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

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Auditoria de acesso</p>
          <h1>Log completo de acessos</h1>
          <p>
            Quem acessou, IP e cidade por IP, quantidade de acessos, tempo em cada página e os
            leads/prospects que estão entrando.
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
            <span>Cadastros</span>
            <strong>{cadastros.length}</strong>
          </div>
          <div className="log-stat">
            <span>Tempo médio/página</span>
            <strong>{fmtDur(summary.tempoMedioMs)}</strong>
          </div>
        </div>
      </section>

      <section className="log-panel">
        <h2>Leads / prospects que estão entrando</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>UF</th>
                <th>Origem</th>
                <th>IP</th>
                <th>Quando</th>
              </tr>
            </thead>
            <tbody>
              {cadastros.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum cadastro ainda.</td>
                </tr>
              ) : (
                cadastros.map((c, i) => (
                  <tr key={`${c.email || c.whatsapp || c.nome}-${c.at}-${i}`}>
                    <td>{c.nome}</td>
                    <td>
                      {c.whatsapp || "—"}
                      {c.email ? (
                        <div style={{ color: "#9aa3b8", fontSize: "0.85em" }}>{c.email}</div>
                      ) : null}
                    </td>
                    <td>{c.cidade || "—"}</td>
                    <td>{c.uf || "—"}</td>
                    <td>{c.origem === "landing" ? "landing" : "onboarding"}</td>
                    <td>{c.ip || "—"}</td>
                    <td>{formatDate(c.at)}</td>
                  </tr>
                ))
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
