#!/usr/bin/env node
// Exibe um log detalhado, organizado e consolidado de todos os usuários
// cadastrados no sistema (Telão, Leads da Landing e Onboarding).
//
// Uso:  node scripts/log-usuarios.mjs
//       node scripts/log-usuarios.mjs --json
//       node scripts/log-usuarios.mjs --telao
//       node scripts/log-usuarios.mjs --leads

import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

async function lerJsonl(nomeArquivo) {
  try {
    const conteudo = await readFile(path.join(DATA_DIR, nomeArquivo), "utf8");
    return conteudo
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function formatarData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  } catch {
    return iso;
  }
}

function formatarTelefone(tel) {
  if (!tel) return "—";
  const nums = String(tel).replace(/\D/g, "");
  if (nums.startsWith("55") && nums.length >= 12) {
    const ddd = nums.slice(2, 4);
    const rest = nums.slice(4);
    if (rest.length === 9) return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  if (nums.length === 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  if (nums.length === 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return tel;
}

async function main() {
  const args = process.argv.slice(2);
  const querJson = args.includes("--json");
  const soTelao = args.includes("--telao");
  const soLeads = args.includes("--leads");

  const [telao, leads, onboarding, accessLogs] = await Promise.all([
    lerJsonl("telao-registros.jsonl"),
    lerJsonl("transparency-leads.jsonl"),
    lerJsonl("onboarding.jsonl"),
    lerJsonl("access-log.jsonl"),
  ]);

  // Index de acessos recentes por IP para ver última atividade
  const ultimosAcessosPorIp = new Map();
  for (const log of accessLogs) {
    if (log.ip && log.at) {
      const atual = ultimosAcessosPorIp.get(log.ip);
      if (!atual || String(log.at) > String(atual.at)) {
        ultimosAcessosPorIp.set(log.ip, log);
      }
    }
  }

  // Normalização unificada
  const lista = [];

  for (const t of telao) {
    const ip = t.ip || "";
    const ultLog = ultimosAcessosPorIp.get(ip);
    lista.push({
      origem: "TELÃO (Pleitos 2026)",
      tipo: "telao",
      nome: t.nome || "—",
      contato: formatarTelefone(t.whatsapp),
      rawContato: t.whatsapp || "",
      email: "—",
      local: "—",
      detalhes: Array.isArray(t.partidos) && t.partidos.length ? `Partidos: ${t.partidos.join(", ")}` : "Todos os partidos",
      ip: ip || "—",
      at: t.at || "",
      ultimaAtividade: ultLog ? `${formatarData(ultLog.at)} (${ultLog.path || ""})` : "—",
    });
  }

  for (const l of leads) {
    const ip = l.ip || "";
    const ultLog = ultimosAcessosPorIp.get(ip);
    lista.push({
      origem: "LANDING (Transparência)",
      tipo: "landing",
      nome: l.nomeCompleto || "—",
      contato: formatarTelefone(l.whatsapp),
      rawContato: l.whatsapp || "",
      email: l.email || "—",
      local: [l.cidade, l.estado].filter(Boolean).join("/") || "—",
      detalhes: l.consentimentoLgpd ? "LGPD: Consentido" : "LGPD: Pendente",
      ip: ip || "—",
      at: l.at || "",
      ultimaAtividade: ultLog ? `${formatarData(ultLog.at)} (${ultLog.path || ""})` : "—",
    });
  }

  for (const o of onboarding) {
    const ip = o.ip || "";
    const ultLog = ultimosAcessosPorIp.get(ip);
    lista.push({
      origem: "ONBOARDING (Mobile)",
      tipo: "onboarding",
      nome: o.nome || "—",
      contato: formatarTelefone(o.whatsapp),
      rawContato: o.whatsapp || "",
      email: o.email || "—",
      local: [o.cidade, o.uf].filter(Boolean).join("/") || "—",
      detalhes: [o.situacao ? `Cargo: ${o.situacao}` : "", o.pergunta ? `Dúvida: "${o.pergunta}"` : ""].filter(Boolean).join(" | ") || "—",
      ip: ip || "—",
      at: o.at || "",
      ultimaAtividade: ultLog ? `${formatarData(ultLog.at)} (${ultLog.path || ""})` : "—",
    });
  }

  // Ordena por data decrescente (mais recente primeiro)
  lista.sort((a, b) => String(b.at).localeCompare(String(a.at)));

  let filtrados = lista;
  if (soTelao) filtrados = lista.filter((u) => u.tipo === "telao");
  if (soLeads) filtrados = lista.filter((u) => u.tipo === "landing");

  if (querJson) {
    console.log(JSON.stringify(filtrados, null, 2));
    return;
  }

  // Estatísticas consolidadas
  const total = lista.length;
  const totalTelao = lista.filter((u) => u.tipo === "telao").length;
  const totalLeads = lista.filter((u) => u.tipo === "landing").length;
  const totalOnboarding = lista.filter((u) => u.tipo === "onboarding").length;
  const ipsUnicos = new Set(lista.map((u) => u.ip).filter((ip) => ip && ip !== "—")).size;
  const contatosUnicos = new Set(
    lista.map((u) => u.rawContato.replace(/\D/g, "")).filter(Boolean)
  ).size;

  const sep = "═".repeat(110);
  const lin = "─".repeat(110);

  console.log("");
  console.log(sep);
  console.log(" 🏛️  PAINEL CONSOLIDADO DE USUÁRIOS E CADASTROS — SALA DE COMANDO 2026");
  console.log(` Gerado em: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date())}`);
  console.log(sep);
  console.log("");
  console.log(" 📊 RESUMO EXECUTIVO:");
  console.log(`    • Total de Usuários Cadastrados : ${total}`);
  console.log(`    • Registros do Telão (/telao/pleitos): ${totalTelao}`);
  console.log(`    • Leads da Landing (Transparência)  : ${totalLeads}`);
  console.log(`    • Onboardings Mobile (/m)           : ${totalOnboarding}`);
  console.log(`    • Telefones Únicos                  : ${contatosUnicos}`);
  console.log(`    • IPs Únicos Registrados            : ${ipsUnicos}`);
  console.log("");
  console.log(lin);
  console.log(` LISTAGEM DETALHADA DOS USUÁRIOS (${filtrados.length} registros)`);
  console.log(lin);

  if (filtrados.length === 0) {
    console.log("  Nenhum usuário cadastrado encontrado com os critérios fornecidos.");
  } else {
    filtrados.forEach((u, idx) => {
      const num = String(idx + 1).padStart(2, "0");
      console.log(`\n [${num}] ${u.nome.toUpperCase()}`);
      console.log(`      Origem    : ${u.origem}`);
      console.log(`      Data/Hora : ${formatarData(u.at)} (Horário de Brasília)`);
      console.log(`      WhatsApp  : ${u.contato}`);
      if (u.email && u.email !== "—") console.log(`      E-mail    : ${u.email}`);
      if (u.local && u.local !== "—") console.log(`      Local     : ${u.local}`);
      console.log(`      Detalhes  : ${u.detalhes}`);
      console.log(`      IP        : ${u.ip}`);
      if (u.ultimaAtividade !== "—") console.log(`      Últ. Ação : ${u.ultimaAtividade}`);
    });
  }

  console.log("\n" + sep);
  console.log(" Dica: você também pode ver este relatório interativo na web em:");
  console.log("   • https://pl.angra.io/log        (Auditoria completa de logs e usuários)");
  console.log("   • https://pl.angra.io/cadastrados (Base consolidada de cadastros)");
  console.log(sep + "\n");
}

main().catch((err) => {
  console.error("Erro ao gerar log de usuários:", err);
  process.exit(1);
});
