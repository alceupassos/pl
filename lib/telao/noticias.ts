// Ticker de notícias do telão: manchetes de eleição dos principais veículos,
// via Google News RSS filtrado por site (mesma fonte de lib/sources/google-news).
// Cache em memória de 5 min; em falha, mantém as últimas manchetes.

import { XMLParser } from "fast-xml-parser";

export type Veiculo = { id: string; nome: string; site: string; cor: string };

export const VEICULOS: Veiculo[] = [
  { id: "folha", nome: "FOLHA", site: "folha.uol.com.br", cor: "#2b6cb0" },
  { id: "estadao", nome: "ESTADÃO", site: "estadao.com.br", cor: "#1a1a1a" },
  { id: "gazeta", nome: "GAZETA DO POVO", site: "gazetadopovo.com.br", cor: "#0f7c3a" },
  { id: "uol", nome: "UOL", site: "uol.com.br", cor: "#f2a900" },
  { id: "jovempan", nome: "JOVEM PAN", site: "jovempan.com.br", cor: "#d81e1e" },
  { id: "globo", nome: "GLOBO / g1", site: "g1.globo.com", cor: "#c4170c" },
  { id: "band", nome: "BAND", site: "band.uol.com.br", cor: "#0a4ea2" },
  { id: "auriverde", nome: "AURIVERDE", site: "auriverdebrasil.com.br", cor: "#1e9a3d" },
];

export type Noticia = { veiculo: string; nome: string; cor: string; titulo: string; link: string; t: number };

const TTL = 5 * 60_000;
const parser = new XMLParser({ ignoreAttributes: false });
let cache: { at: number; data: Noticia[] } | null = null;
let inflight: Promise<Noticia[]> | null = null;

function url(site: string): string {
  const q = `(eleição OR eleições OR apuração OR candidato OR TSE) site:${site} when:1d`;
  return `https://news.google.com/rss/search?${new URLSearchParams({ q, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" })}`;
}

type Item = { title?: string; link?: string; pubDate?: string };

async function doVeiculo(v: Veiculo): Promise<Noticia[]> {
  try {
    const res = await fetch(url(v.site), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (telao-pleitos)" },
    });
    if (!res.ok) return [];
    const doc = parser.parse(await res.text());
    const raw = doc?.rss?.channel?.item;
    const items: Item[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return items
      .map((it) => ({
        veiculo: v.id,
        nome: v.nome,
        cor: v.cor,
        // o título vem "Manchete - Veículo": remove o sufixo
        titulo: String(it.title ?? "").replace(/\s+-\s+[^-]+$/, "").trim(),
        link: String(it.link ?? ""),
        t: it.pubDate ? Date.parse(it.pubDate) || 0 : 0,
      }))
      .filter((n) => n.titulo)
      .sort((a, b) => b.t - a.t)
      .slice(0, 5);
  } catch {
    return [];
  }
}

async function fetchAll(): Promise<Noticia[]> {
  const porVeiculo = await Promise.all(VEICULOS.map(doVeiculo));
  // intercala os veículos (1 de cada por rodada) para o ticker variar a fonte
  const out: Noticia[] = [];
  for (let i = 0; i < 5; i++) for (const lista of porVeiculo) if (lista[i]) out.push(lista[i]);
  return out;
}

export async function getNoticias(): Promise<Noticia[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  inflight ??= fetchAll().finally(() => (inflight = null));
  const data = await inflight;
  if (data.length) cache = { at: Date.now(), data };
  return cache?.data ?? data;
}
