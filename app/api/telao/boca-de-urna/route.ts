import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/api-auth";
import { ensureFreshPesquisas, getPesquisas } from "@/lib/sources/pesquisas";
import { PESQUISAS_PADRAO } from "@/lib/telao/pesquisas-padrao";
import {
  isBocaPleito,
  readBoca,
  saveBoca,
  type BocaPesquisa,
  type TipoLevantamento,
} from "@/lib/telao/boca-de-urna";

export const dynamic = "force-dynamic";

// ?tipo=boca (padrão) | pesquisa — boca de urna ou última pesquisa registrada
// GET  → levantamentos lançados (público, como a apuração)
// PUT  { pleito, pesquisa | null } → grava/apaga (exige sessão do cockpit)
function tipoDe(req: Request): TipoLevantamento {
  return new URL(req.url).searchParams.get("tipo") === "pesquisa" ? "pesquisa" : "boca";
}

// Presidente sem pesquisa lançada → usa a mais recente da fonte Wikipédia
// (lib/sources/pesquisas), convertida para votos válidos entre os listados.
const PRES_WIKI: { key: "lula" | "flavio" | "caiado" | "zema" | "renan"; num: number; nome: string; partido: string }[] = [
  { key: "lula", num: 13, nome: "LULA", partido: "PT" },
  { key: "flavio", num: 22, nome: "FLAVIO BOLSONARO", partido: "PL" },
  { key: "caiado", num: 55, nome: "RONALDO CAIADO", partido: "PSD" },
  { key: "zema", num: 30, nome: "ZEMA", partido: "NOVO" },
  { key: "renan", num: 14, nome: "RENAN SANTOS", partido: "MISSÃO" },
];

function pesquisaPresidencialWiki(): BocaPesquisa | null {
  ensureFreshPesquisas();
  const p = getPesquisas().find((x) => PRES_WIKI.some((c) => (x[c.key] ?? 0) > 0));
  if (!p) return null;
  const soma = PRES_WIKI.reduce((s, c) => s + (p[c.key] ?? 0), 0);
  if (soma <= 0) return null;
  return {
    instituto: p.instituto,
    divulgadoEm: p.data,
    margem: 2,
    entrevistas: 0,
    fonte: "Wikipédia (agregador) · convertida p/ válidos",
    cand: PRES_WIKI.filter((c) => (p[c.key] ?? 0) > 0)
      .map((c) => ({ num: c.num, nome: c.nome, partido: c.partido, pct: Math.round(((p[c.key] ?? 0) / soma) * 1000) / 10 }))
      .sort((a, b) => b.pct - a.pct),
  };
}

export async function GET(req: NextRequest) {
  const tipo = tipoDe(req);
  const dados = await readBoca(tipo);
  if (tipo === "pesquisa") {
    for (const k of ["presidente", "governador-sp", "senador-sp"] as const) dados[k] ??= PESQUISAS_PADRAO[k];
  }
  if (tipo === "pesquisa" && !dados.presidente) {
    const wiki = pesquisaPresidencialWiki();
    if (wiki) dados.presidente = wiki;
  }
  return NextResponse.json(dados, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: NextRequest) {
  if (!getSession(req)) return NextResponse.json({ error: "faça login no cockpit" }, { status: 401 });
  let body: { pleito?: string; pesquisa?: BocaPesquisa | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  if (!body.pleito || !isBocaPleito(body.pleito)) {
    return NextResponse.json({ error: "pleito inválido" }, { status: 400 });
  }
  return NextResponse.json(await saveBoca(body.pleito, body.pesquisa ?? null, tipoDe(req)));
}
