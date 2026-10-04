import { headers } from "next/headers";

import { appendAccessLog } from "@/lib/access-log";
import { readCadastros } from "@/lib/cadastros";

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

export const dynamic = "force-dynamic";

export default async function CadastradosPage() {
  await appendAccessLog(await headers(), {
    event: "cadastrados_page_view",
    path: "/cadastrados",
  });

  const cadastros = await readCadastros();
  const telaoCount = cadastros.filter((c) => c.origem === "telao").length;
  const landingCount = cadastros.filter((c) => c.origem === "landing").length;
  const onboardingCount = cadastros.filter((c) => c.origem === "onboarding").length;
  const uniquePhones = new Set(
    cadastros.map((c) => c.whatsapp.replace(/\D/g, "")).filter(Boolean),
  ).size;

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Base de cadastrados</p>
          <h1>Usuários & Participantes</h1>
          <p>
            Base consolidada de todas as pessoas que se registraram no sistema — pelo Telão de Apuração
            (/telao/pleitos e /c), formulário de Transparência e Onboarding de lideranças.
          </p>
        </div>
        <div className="log-stat-grid">
          <div className="log-stat">
            <span>Total cadastros</span>
            <strong>{cadastros.length}</strong>
          </div>
          <div className="log-stat">
            <span>Telefones únicos</span>
            <strong>{uniquePhones}</strong>
          </div>
          <div className="log-stat">
            <span>Por canal</span>
            <strong style={{ fontSize: "20px", marginTop: "12px" }}>
              {telaoCount} 📺 / {landingCount} 🚀
            </strong>
            <span style={{ fontSize: "10px", marginTop: "4px", color: "#a5b4fc" }}>
              {onboardingCount} mobile
            </span>
          </div>
        </div>
      </section>

      <section className="log-panel">
        <h2>Listagem completa ({cadastros.length})</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>WhatsApp</th>
                <th>Origem</th>
                <th>Partidos / Preferências</th>
                <th>Local</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {cadastros.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", opacity: 0.7 }}>
                    Nenhum cadastro registrado ainda.
                  </td>
                </tr>
              ) : (
                cadastros.map((c, index) => {
                  const rawDigits = c.whatsapp ? c.whatsapp.replace(/\D/g, "") : "";
                  const waUrl = rawDigits
                    ? `https://wa.me/${rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`}`
                    : null;
                  return (
                    <tr key={`${c.id || c.email || c.whatsapp || c.nome}-${c.at}-${index}`}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(c.at)}</td>
                      <td style={{ fontWeight: 600, color: "#fff" }}>{c.nome}</td>
                      <td>
                        {waUrl ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#86efac", textDecoration: "none" }}
                            title="Abrir no WhatsApp"
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
    </main>
  );
}
