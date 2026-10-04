// Notícias do telão: título + resumo + horário, só recentes. Usa o RSS próprio
// de cada veículo (traz resumo); Band e Auriverde, sem feed funcional, vêm do
// Google News (só título). Cache em memória de 5 min; em falha mantém o último.

import { XMLParser } from "fast-xml-parser";

export type Veiculo = { id: string; nome: string; site: string; cor: string; rss?: string; geral?: boolean };

export const VEICULOS: Veiculo[] = [
  { id: "folha", nome: "FOLHA", site: "folha.uol.com.br", cor: "#2b6cb0", rss: "https://feeds.folha.uol.com.br/poder/rss091.xml" },
  { id: "estadao", nome: "ESTADÃO", site: "estadao.com.br", cor: "#3a3a3a", rss: "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/politica/" },
  { id: "gazeta", nome: "GAZETA DO POVO", site: "gazetadopovo.com.br", cor: "#0f7c3a", rss: "https://www.gazetadopovo.com.br/feed/rss/republica.xml" },
  { id: "uol", nome: "UOL", site: "uol.com.br", cor: "#c98a00", rss: "https://rss.uol.com.br/feed/noticias.xml", geral: true },
  { id: "jovempan", nome: "JOVEM PAN", site: "jovempan.com.br", cor: "#d81e1e", rss: "https://jovempan.com.br/feed", geral: true },
  { id: "globo", nome: "GLOBO / g1", site: "g1.globo.com", cor: "#c4170c", rss: "https://g1.globo.com/rss/g1/", geral: true },
  { id: "cnn", nome: "CNN BRASIL", site: "cnnbrasil.com.br", cor: "#cc0000", rss: "https://www.cnnbrasil.com.br/feed/", geral: true },
  { id: "band", nome: "BAND", site: "band.uol.com.br", cor: "#0a4ea2" },
  { id: "auriverde", nome: "AURIVERDE", site: "auriverdebrasil.com.br", cor: "#1e9a3d" },
  // destaques gerais de eleição no Google News (qualquer veículo)
  { id: "gnews", nome: "GOOGLE NEWS", site: "", cor: "#4285f4" },
];

export type Noticia = {
  veiculo: string;
  nome: string;
  cor: string;
  titulo: string;
  resumo: string;
  link: string;
  t: number; // epoch ms
};

const TTL = 5 * 60_000;
const JANELA = 12 * 3.6e6; // só notícias das últimas 12h
const POLITICA =
  /elei|apura|candidat|tse\b|urna|voto|pesquisa|governad|senad|deputad|presiden|lula|bolsonaro|tarc[ií]sio|haddad|derrite|tebet|marina silva|pol[ií]tic|campanha|segundo turno|1º turno|primeiro turno/i;

const parser = new XMLParser({ ignoreAttributes: false });
let cache: { at: number; data: Noticia[] } | null = null;
let inflight: Promise<Noticia[]> | null = null;

function limpa(html: unknown): string {
  const s = typeof html === "string" ? html : html && typeof html === "object" && "#text" in html ? String((html as { "#text": unknown })["#text"]) : "";
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function corta(s: string, n = 230): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 120 ? cut.lastIndexOf(" ") : n)}…`;
}

// pubDate em pt-BR ("Dom, 04 Out 2026 01:35:00 -0300") → inglês para Date.parse
const MES: Record<string, string> = { fev: "Feb", abr: "Apr", mai: "May", ago: "Aug", set: "Sep", out: "Oct", dez: "Dec" };
function data(v: unknown): number {
  const s = String(v ?? "").replace(/^[A-Za-zÀ-ú]{3},\s*/, "");
  const t = Date.parse(s.replace(/\b([A-Za-z]{3})\b/, (m) => MES[m.toLowerCase()] ?? m));
  return Number.isFinite(t) ? t : 0;
}

function gnUrl(site: string): string {
  const q = `(eleição OR eleições OR apuração OR candidato OR TSE)${site ? ` site:${site}` : ""} when:1d`;
  return `https://news.google.com/rss/search?${new URLSearchParams({ q, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" })}`;
}

type Item = Record<string, unknown>;

async function doVeiculo(v: Veiculo): Promise<Noticia[]> {
  const viaGN = !v.rss;
  try {
    const res = await fetch(v.rss ?? gnUrl(v.site), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (telao-pleitos)" },
    });
    if (!res.ok) return [];
    const doc = parser.parse(await res.text());
    const raw = doc?.rss?.channel?.item;
    const items: Item[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const agora = Date.now();
    return items
      .map((it) => {
        let titulo = limpa(it.title);
        const fonteGN = viaGN ? (titulo.match(/\s+-\s+([^-]+)$/)?.[1] ?? "").trim() : "";
        if (viaGN) titulo = titulo.replace(/\s+-\s+[^-]+$/, "");
        const resumo = viaGN ? "" : corta(limpa(it.description) || limpa(it["content:encoded"]));
        return {
          veiculo: v.id,
          nome: !v.site && fonteGN ? `G NEWS · ${fonteGN.toUpperCase()}` : v.nome,
          cor: v.cor,
          titulo,
          resumo: resumo === titulo ? "" : resumo,
          link: String(it.link ?? ""),
          t: data(it.pubDate),
        };
      })
      .filter((n) => n.titulo && (!v.geral || POLITICA.test(`${n.titulo} ${n.resumo}`)))
      .filter((n) => !n.t || agora - n.t < JANELA)
      .sort((a, b) => b.t - a.t)
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function fetchAll(): Promise<Noticia[]> {
  const porVeiculo = await Promise.all(VEICULOS.map(doVeiculo));
  // mais recentes primeiro, sem deixar um veículo dominar (máx. 6 cada)
  return porVeiculo.flat().sort((a, b) => b.t - a.t).slice(0, 45);
}

export async function getNoticias(): Promise<Noticia[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  inflight ??= fetchAll().finally(() => (inflight = null));
  const data = await inflight;
  if (data.length) cache = { at: Date.now(), data };
  return cache?.data ?? data;
}
