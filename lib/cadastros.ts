// Cadastros unificados: leads da landing (transparency-leads.jsonl) + onboarding
// do /m (onboarding.jsonl). Normaliza num formato único e ordena por nome (A→Z),
// para listar em /mapa e /log "quem está entrando".

import { readLeadLogs } from "@/lib/access-log";
import { readOnboardingLog } from "@/lib/onboarding-log";

export type Cadastro = {
  nome: string;
  cidade: string;
  uf: string;
  whatsapp: string;
  email: string;
  origem: "landing" | "onboarding";
  situacao?: string;
  pergunta?: string;
  ip?: string;
  at: string;
};

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function readCadastros(): Promise<Cadastro[]> {
  const [leads, onboarding] = await Promise.all([readLeadLogs(), readOnboardingLog()]);

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

  return [...deLeads, ...deOnboarding].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
}
