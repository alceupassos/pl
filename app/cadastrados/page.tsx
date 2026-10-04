import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";

import { appendAccessLog } from "@/lib/access-log";

type Lead = {
  at?: string;
  destinationEmail?: string;
  nomeCompleto?: string;
  email?: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
  consentimentoLgpd?: boolean;
  [key: string]: unknown;
};

const LEADS_FILE = path.join(process.cwd(), "data", "transparency-leads.jsonl");

async function readLeads(): Promise<Lead[]> {
  try {
    const content = await readFile(LEADS_FILE, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Lead;
        } catch {
          return null;
        }
      })
      .filter((v): v is Lead => Boolean(v))
      .sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
  } catch {
    return [];
  }
}

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

  const leads = await readLeads();
  const withConsent = leads.filter((lead) => lead.consentimentoLgpd).length;
  const uniqueEmails = new Set(
    leads.map((lead) => (lead.email || "").toLowerCase()).filter(Boolean),
  ).size;

  return (
    <main className="log-page">
      <section className="log-hero">
        <div>
          <p className="log-kicker">Base de cadastrados</p>
          <h1>Pessoas cadastradas pela landing</h1>
          <p>
            Lista completa dos leads enviados pelo formulário de transparência
            (modal &quot;Acesso Transparente&quot;), com nome, contato, cidade/UF e consentimento LGPD.
          </p>
        </div>
        <div className="log-stat-grid">
          <div className="log-stat">
            <span>Total cadastros</span>
            <strong>{leads.length}</strong>
          </div>
          <div className="log-stat">
            <span>E-mails únicos</span>
            <strong>{uniqueEmails}</strong>
          </div>
          <div className="log-stat">
            <span>Com consent. LGPD</span>
            <strong>{withConsent}</strong>
          </div>
        </div>
      </section>

      <section className="log-panel">
        <h2>Todos os cadastros</h2>
        <div className="log-table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Nome completo</th>
                <th>E-mail</th>
                <th>WhatsApp</th>
                <th>Cidade</th>
                <th>UF</th>
                <th>LGPD</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", opacity: 0.7 }}>
                    Nenhum cadastro registrado ainda.
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => (
                  <tr key={`${lead.at}-${lead.email ?? ""}-${index}`}>
                    <td>{formatDate(lead.at)}</td>
                    <td>{lead.nomeCompleto || "—"}</td>
                    <td>{lead.email || "—"}</td>
                    <td>{lead.whatsapp || "—"}</td>
                    <td>{lead.cidade || "—"}</td>
                    <td>{lead.estado || "—"}</td>
                    <td>{lead.consentimentoLgpd ? "Sim" : "Não"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
