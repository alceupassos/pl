import type { BocaPesquisa } from "./boca-de-urna";
export type ResearchAudit = { status: "pending"; sum: number; missing: number[]; issues: string[]; covered: number; total: number; };
export function auditResearch(p: BocaPesquisa, candidates: { num: number }[]): ResearchAudit {
 const numbers = p.cand.map(c => c.num), issues: string[] = [];
 const missing = candidates.filter(c => !numbers.includes(c.num)).map(c => c.num);
 const sum = p.cand.reduce((s,c) => s + (Number.isFinite(c.pct) ? c.pct : 0), 0);
 if (missing.length) issues.push(`${missing.length} candidato(s) sem percentual neste levantamento. Não equivale a 0%.`);
 if (new Set(numbers).size !== numbers.length) issues.push("Números de candidatos duplicados.");
 if (p.cand.some(c => !Number.isFinite(c.pct) || c.pct < 0 || c.pct > 100)) issues.push("Percentual fora do intervalo permitido.");
 if (p.cand.some(c => !c.nome.trim())) issues.push("Identificação de candidato incompleta.");
 if (!(p.entrevistas > 0)) issues.push("Tamanho da amostra não informado.");
 if (sum > 100.5) issues.push("Soma acima de 100%: conferir base, arredondamento e múltiplas escolhas.");
 if (sum < 99.5) issues.push("Cobertura percentual incompleta: conferir outros candidatos e base de votos.");
 issues.push("Pendente: relatório primário, registro PesqEle, datas completas, cenário, abrangência, base de cálculo e nível de confiança.");
 return {status: "pending", sum, missing, issues, covered: candidates.length - missing.length, total: candidates.length};
}
export function weightedProgress(rows: {secoesTotal: number; secoesTot: number}[]) {
 const total = rows.reduce((s,r) => s + Math.max(0,r.secoesTotal), 0), counted = rows.reduce((s,r) => s + Math.max(0,r.secoesTot), 0);
 return total > 0 ? 100 * counted / total : null;
}
