// Pesquisa de boca de urna para o telão de pleitos. Não há API oficial: os
// institutos (Ipec, Quaest, AtlasIntel…) divulgam às 17h na TV/imprensa e a
// equipe lança os números em /telao/boca-de-urna. Persistência em arquivo
// (data/boca-de-urna.json), como o resto do app.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PleitoId } from "./tse-apuracao";

export const BOCA_PLEITOS = ["presidente", "governador-sp", "senador-sp"] as const;
export type BocaPleitoId = (typeof BOCA_PLEITOS)[number];

export type BocaCand = { num: number; nome: string; partido: string; pct: number };

export type BocaPesquisa = {
  instituto: string;
  divulgadoEm: string; // "17:00"
  margem: number; // pontos percentuais (±)
  entrevistas: number;
  fonte: string; // veículo / link
  cand: BocaCand[];
};

export type BocaDeUrna = Partial<Record<BocaPleitoId, BocaPesquisa>> & { atualizadoEm?: string };

// Mesmo formato serve para a última pesquisa registrada (tipo "pesquisa"),
// usada na tela comparativa projeção × pesquisa × boca de urna × realidade.
export type TipoLevantamento = "boca" | "pesquisa";
const FILES: Record<TipoLevantamento, string> = {
  boca: path.join(process.cwd(), "data", "boca-de-urna.json"),
  pesquisa: path.join(process.cwd(), "data", "pesquisa-telao.json"),
};

export function isBocaPleito(id: string): id is BocaPleitoId {
  return (BOCA_PLEITOS as readonly string[]).includes(id);
}

export function temBoca(id: PleitoId, b: BocaDeUrna): boolean {
  return isBocaPleito(id) && (b[id]?.cand.length ?? 0) > 0;
}

export async function readBoca(tipo: TipoLevantamento = "boca"): Promise<BocaDeUrna> {
  try {
    return JSON.parse(await readFile(FILES[tipo], "utf8")) as BocaDeUrna;
  } catch {
    return {};
  }
}

function clean(p: BocaPesquisa): BocaPesquisa {
  const s = (v: unknown, max = 80) => String(v ?? "").slice(0, max).trim();
  const n = (v: unknown, min: number, max: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : min;
  };
  return {
    instituto: s(p.instituto, 40),
    divulgadoEm: s(p.divulgadoEm, 10),
    margem: n(p.margem, 0, 10),
    entrevistas: Math.round(n(p.entrevistas, 0, 1e7)),
    fonte: s(p.fonte, 200),
    cand: (Array.isArray(p.cand) ? p.cand : [])
      .map((c) => ({
        num: Math.round(n(c.num, 0, 99999)),
        nome: s(c.nome),
        partido: s(c.partido, 20),
        pct: Math.round(n(c.pct, 0, 100) * 10) / 10,
      }))
      .filter((c) => c.nome && c.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 20),
  };
}

/** Grava (ou apaga, com `null`) a pesquisa de um pleito. Escrita atômica. */
export async function saveBoca(
  id: BocaPleitoId,
  pesquisa: BocaPesquisa | null,
  tipo: TipoLevantamento = "boca",
): Promise<BocaDeUrna> {
  const FILE = FILES[tipo];
  const cur = await readBoca(tipo);
  if (pesquisa) cur[id] = clean(pesquisa);
  else delete cur[id];
  cur.atualizadoEm = new Date().toISOString();
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(cur, null, 2), "utf8");
  await rename(tmp, FILE);
  return cur;
}
