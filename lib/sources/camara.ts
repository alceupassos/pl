// Fonte REAL de gastos — Câmara dos Deputados, Dados Abertos (JSON, sem chave,
// robusto, sem throttle). Despesas da cota parlamentar (CEAP) do deputado
// Sóstenes Cavalcante (id 178947): valores reais por categoria e por mês.
// https://dadosabertos.camara.leg.br/api/v2/deputados/178947/despesas
//
// Padrão idêntico aos outros providers: getter SÍNCRONO + fallback, busca
// assíncrona fora de banda com TTL longo (despesas mudam devagar), warm-start
// em disco. Falhou → null → live-mock cai nas rubricas sintéticas.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DEPUTADO_ID = 178947; // Sóstenes Cavalcante (PL-RJ)
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — cota é atualizada em lotes lentos
const FETCH_TIMEOUT_MS = 20_000;
const MAX_PAGINAS = 6; // ~600 lançamentos do ano — cobre o exercício
const CACHE_FILE = join(process.cwd(), "data", "camara-cache.json");

export type CotaReal = {
  ano: number;
  totalReais: number;
  categorias: { nome: string; reais: number }[]; // desc por valor
  porMes: { mes: number; reais: number }[]; // crescente por mês
};

let cache: { at: number; value: CotaReal | null } = { at: 0, value: null };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && typeof raw.totalReais === "number") cache = { at: 0, value: raw };
  } catch {
    /* primeira execução */
  }
})();

/** Cota parlamentar real (agregada). null = sem dado → usar rubricas sintéticas. */
export function getCotaReal(): CotaReal | null {
  return cache.value;
}

/** Dispara o refresh se venceu e não há busca em voo. Não bloqueia. */
export function ensureFreshCamara(): void {
  if (inFlight) return;
  if (Date.now() - cache.at < TTL_MS && cache.value !== null) return;
  inFlight = true;
  void refresh().finally(() => {
    inFlight = false;
  });
}

type DespesaRaw = { ano?: number; mes?: number; tipoDespesa?: string; valorLiquido?: number };

async function refresh(): Promise<void> {
  try {
    const ano = new Date().getFullYear();
    const despesas: DespesaRaw[] = [];
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina += 1) {
      const page = await fetchPagina(ano, pagina);
      if (page === null) break; // erro de rede → mantém o último bom
      despesas.push(...page);
      if (page.length < 100) break; // última página
    }
    if (!despesas.length) return;

    const porCategoria = new Map<string, number>();
    const porMes = new Map<number, number>();
    let total = 0;
    for (const d of despesas) {
      const v = typeof d.valorLiquido === "number" ? d.valorLiquido : 0;
      if (v <= 0) continue;
      total += v;
      const cat = limparCategoria(d.tipoDespesa ?? "Outros");
      porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + v);
      const mes = typeof d.mes === "number" ? d.mes : 0;
      if (mes) porMes.set(mes, (porMes.get(mes) ?? 0) + v);
    }

    const value: CotaReal = {
      ano,
      totalReais: Math.round(total),
      categorias: [...porCategoria.entries()]
        .map(([nome, reais]) => ({ nome, reais: Math.round(reais) }))
        .sort((a, b) => b.reais - a.reais),
      porMes: [...porMes.entries()]
        .map(([mes, reais]) => ({ mes, reais: Math.round(reais) }))
        .sort((a, b) => a.mes - b.mes),
    };
    cache = { at: Date.now(), value };
    persist(value);
  } catch {
    /* mantém o último bom */
  }
}

async function fetchPagina(ano: number, pagina: number): Promise<DespesaRaw[] | null> {
  const params = new URLSearchParams({
    ano: String(ano),
    itens: "100",
    pagina: String(pagina),
    ordem: "DESC",
    ordenarPor: "dataDocumento",
  });
  const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${DEPUTADO_ID}/despesas?${params}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { dados?: DespesaRaw[] };
    return json.dados ?? [];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR." → "Divulgação parlamentar", etc.
const APELIDOS: Record<string, string> = {
  "DIVULGAÇÃO DA ATIVIDADE PARLAMENTAR": "Divulgação parlamentar",
  "PASSAGEM AÉREA - SIGEPA": "Passagem aérea",
  "PASSAGEM AÉREA - RPA": "Passagem aérea",
  "LOCAÇÃO OU FRETAMENTO DE VEÍCULOS AUTOMOTORES": "Locação de veículos",
  "COMBUSTÍVEIS E LUBRIFICANTES": "Combustíveis",
  "MANUTENÇÃO DE ESCRITÓRIO DE APOIO À ATIVIDADE PARLAMENTAR": "Manutenção de escritório",
  "TELEFONIA": "Telefonia",
  "CONSULTORIAS, PESQUISAS E TRABALHOS TÉCNICOS": "Consultorias e pesquisas",
  "SERVIÇOS POSTAIS": "Serviços postais",
};
function limparCategoria(raw: string): string {
  const norm = raw.trim().replace(/\.$/, "").toUpperCase();
  if (APELIDOS[norm]) return APELIDOS[norm];
  // título simples: primeira maiúscula, resto minúsculo, sem ponto final
  const s = norm.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function persist(value: CotaReal): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify(value)}\n`);
  } catch {
    /* FS read-only */
  }
}
