// Cadastros unificados: leads da landing (transparency-leads.jsonl), onboarding
// do /m (onboarding.jsonl) e registros do telão (telao-registros.jsonl).
// Normaliza num formato único e ordena por data mais recente ou nome.

import { readLeadLogs } from "@/lib/access-log";
import { readOnboardingLog } from "@/lib/onboarding-log";
import { readRecords } from "@/lib/store";

export type Cadastro = {
  id?: string;
  nome: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  email: string;
  origem: "landing" | "onboarding" | "telao";
  partidos?: string[];
  situacao?: string;
  pergunta?: string;
  ip?: string;
  ua?: string;
  at: string;
};

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function readCadastros(): Promise<Cadastro[]> {
  const [leads, onboarding, telao] = await Promise.all([
    readLeadLogs(),
    readOnboardingLog(),
    readRecords<{
      id: string;
      at: string;
      nome?: string;
      whatsapp?: string;
      partidos?: string[];
      ip?: string;
      ua?: string;
    }>("telao-registros"),
  ]);

  const deLeads: Cadastro[] = leads.map((l) => ({
    nome: s(l.nomeCompleto) || "—",
    cidade: s(l.cidade) || s(l.city),
    uf: s(l.estado) || s(l.region),
    whatsapp: s(l.whatsapp),
    email: s(l.email),
    origem: "landing",
    ip: s(l.ip) || undefined,
    at: s(l.at),
  }));

  const deOnboarding: Cadastro[] = onboarding.map((o) => ({
    nome: s(o.nome) || "—",
    cidade: s(o.cidade),
    uf: s(o.uf),
    whatsapp: s(o.whatsapp),
    email: s(o.email),
    origem: "onboarding",
    situacao: s(o.situacao),
    pergunta: s(o.pergunta),
    ip: s(o.ip) || undefined,
    at: s(o.at),
  }));

  const deTelao: Cadastro[] = telao.map((t) => ({
    id: t.id,
    nome: s(t.nome) || "—",
    cidade: "",
    uf: "",
    whatsapp: s(t.whatsapp),
    email: "",
    origem: "telao",
    partidos: Array.isArray(t.partidos) ? t.partidos : [],
    ip: s(t.ip) || undefined,
    ua: s(t.ua) || undefined,
    at: s(t.at),
  }));

  return [...deLeads, ...deOnboarding, ...deTelao].sort((a, b) =>
    (b.at || "").localeCompare(a.at || ""),
  );
}
