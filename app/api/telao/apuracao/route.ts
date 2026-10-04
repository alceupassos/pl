import { NextResponse } from "next/server";

import {
  PLEITO_CFG,
  getApuracao,
  isPleitoId,
  type Apuracao,
  type Escopo,
  type PleitoId,
} from "@/lib/telao/tse-apuracao";

// o telão exibe no máximo ~20 por pleito; enviar 60 basta (deputados têm 1.000+)
const enxuto = (a: Apuracao): Apuracao => ({ ...a, cand: a.cand.slice(0, 60) });

export const dynamic = "force-dynamic";

// GET /api/telao/apuracao                      → todos os pleitos (estado / Brasil)
// GET /api/telao/apuracao?pleito=id            → um pleito
// &mu=71072                                     → recorte por município de SP (cód. TSE)
// &mu=71072&zona=0001                           → recorte por zona eleitoral
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const mu = q.get("mu") ?? "";
  const zona = q.get("zona") ?? "";
  if ((mu && !/^\d{5}$/.test(mu)) || (zona && (!mu || !/^\d{4}$/.test(zona)))) {
    return NextResponse.json({ error: "filtro inválido" }, { status: 400 });
  }
  const escopo: Escopo = mu ? { mu, zona: zona || undefined } : {};

  const pleito = q.get("pleito");
  if (pleito) {
    if (!isPleitoId(pleito)) return NextResponse.json({ error: "pleito inválido" }, { status: 400 });
    return NextResponse.json(enxuto(await getApuracao(pleito, escopo)));
  }
  const ids = Object.keys(PLEITO_CFG) as PleitoId[];
  const all = await Promise.all(ids.map((id) => getApuracao(id, escopo)));
  return NextResponse.json(Object.fromEntries(ids.map((id, i) => [id, enxuto(all[i])])));
}
