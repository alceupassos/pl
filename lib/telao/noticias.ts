// Notícias do telão: título + resumo + horário, só recentes. Usa o RSS próprio
// de cada veículo (traz resumo); Band e Auriverde, sem feed funcional, vêm do
// Google News (só título). Cache em memória de 5 min; em falha mantém o último.

import { XMLParser } from "fast-xml-parser";

export type Veiculo = { id: string; nome: string; site: string; cor: string; rss?: string; geral?: boolean; q?: string };

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
  // um recorte por cargo, para a página de notícias cobrir todos os cargos
  { id: "gn-presidente", nome: "GOOGLE NEWS", site: "", cor: "#4285f4", q: "(candidato OR candidata) presidente eleição 2026" },
  { id: "gn-governador", nome: "GOOGLE NEWS", site: "", cor: "#4285f4", q: "(candidato OR candidata) governador eleição 2026" },
  { id: "gn-senador", nome: "GOOGLE NEWS", site: "", cor: "#4285f4", q: "(candidato OR candidata) senado OR senador eleição 2026" },
  { id: "gn-depfed", nome: "GOOGLE NEWS", site: "", cor: "#4285f4", q: "\"deputado federal\" OR \"deputada federal\" eleição 2026" },
  { id: "gn-depest", nome: "GOOGLE NEWS", site: "", cor: "#4285f4", q: "\"deputado estadual\" OR \"deputada estadual\" eleição 2026" },
];

/** Recorte devolvido: o telão usa o padrão (letreiro curto); a página de notícias pede tudo. */
export type OpcoesNoticias = { porVeiculo?: number; total?: number; horas?: number };
export const NOTICIAS_TELAO: Required<OpcoesNoticias> = { porVeiculo: 6, total: 45, horas: 12 };
export const NOTICIAS_TODAS: Required<OpcoesNoticias> = { porVeiculo: 40, total: 400, horas: 24 };

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
const JANELA = 24 * 3.6e6; // coleta as últimas 24h; cada recorte filtra a sua janela
const POLITICA =
  /elei|apura|candidat|tse\b|urna|voto|pesquisa|governad|senad|deputad|presiden|lula|bolsonaro|tarc[ií]sio|haddad|derrite|tebet|marina silva|pol[ií]tic|campanha|segundo turno|1º turno|primeiro turno/i;

const parser = new XMLParser({ ignoreAttributes: false });
let cache: { at: number; data: Noticia[] } | null = null;
let inflight: Promise<Noticia[]> | null = null;

function fixAcentos(str: string): string {
  if (!str) return "";
  return str
    .replace(/&atilde;/gi, "ã").replace(/&otilde;/gi, "õ")
    .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í").replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú")
    .replace(/&acirc;/gi, "â").replace(/&ecirc;/gi, "ê").replace(/&ocirc;/gi, "ô")
    .replace(/&agrave;/gi, "à")
    .replace(/&ccedil;/gi, "ç")
    .replace(/&Atilde;/g, "Ã").replace(/&Otilde;/g, "Õ")
    .replace(/&Aacute;/g, "Á").replace(/&Eacute;/g, "É").replace(/&Iacute;/g, "Í").replace(/&Oacute;/g, "Ó").replace(/&Uacute;/g, "Ú")
    .replace(/&Acirc;/g, "Â").replace(/&Ecirc;/g, "Ê").replace(/&Ocirc;/g, "Ô")
    .replace(/&Agrave;/g, "À")
    .replace(/&Ccedil;/g, "Ç")
    // Mojibake comum (UTF-8 mal decodificado em ISO-8859-1)
    .replace(/Ã¡/g, "á").replace(/Ã /g, "à").replace(/Ã¢/g, "â").replace(/Ã£/g, "ã")
    .replace(/Ã©/g, "é").replace(/Ãª/g, "ê").replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó").replace(/Ã´/g, "ô").replace(/Ãµ/g, "õ")
    .replace(/Ãº/g, "ú").replace(/Ã¼/g, "ü").replace(/Ã§/g, "ç")
    .replace(/Ã/g, "Á").replace(/Ã/g, "À").replace(/Ã/g, "Â").replace(/Ã/g, "Ã")
    .replace(/Ã/g, "É").replace(/Ã/g, "Ê").replace(/Ã/g, "Í")
    .replace(/Ã/g, "Ó").replace(/Ã/g, "Ô").replace(/Ã/g, "Õ")
    .replace(/Ã/g, "Ú").replace(/Ã/g, "Ç")
    .replace(/\uFFFD/g, "");
}

function limpa(html: unknown): string {
  const s = typeof html === "string" ? html : html && typeof html === "object" && "#text" in html ? String((html as { "#text": unknown })["#text"]) : "";
  const limpo = s
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
  return fixAcentos(limpo);
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

function gnUrl(site: string, busca?: string): string {
  const q = `${busca ?? "(eleição OR eleições OR apuração OR candidato OR TSE)"}${site ? ` site:${site}` : ""} when:1d`;
  return `https://news.google.com/rss/search?${new URLSearchParams({ q, hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" })}`;
}

type Item = Record<string, unknown>;

async function doVeiculo(v: Veiculo): Promise<Noticia[]> {
  const viaGN = !v.rss;
  try {
    const res = await fetch(v.rss ?? gnUrl(v.site, v.q), {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Mozilla/5.0 (telao-pleitos)" },
    });
    if (!res.ok) return [];
    const buf = Buffer.from(await res.arrayBuffer());
    const utf8Str = buf.toString("utf8");
    // Se UTF-8 produziu caractere de substituição (\uFFFD), decodifica como latin1 (ISO-8859-1)
    const xmlText = utf8Str.includes("\uFFFD") ? buf.toString("latin1") : utf8Str;
    const doc = parser.parse(xmlText);
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
      .slice(0, NOTICIAS_TODAS.porVeiculo);
  } catch {
    return [];
  }
}

const chaveTitulo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function fetchAll(): Promise<Noticia[]> {
  const porVeiculo = await Promise.all(VEICULOS.map(doVeiculo));
  // a mesma matéria pode vir de vários feeds (ex.: buscas por cargo): fica a 1ª
  const links = new Set<string>();
  const titulos = new Set<string>();
  return porVeiculo
    .flat()
    .sort((a, b) => b.t - a.t)
    .filter((n) => {
      const k = chaveTitulo(n.titulo);
      if (links.has(n.link) || titulos.has(k)) return false;
      links.add(n.link);
      titulos.add(k);
      return true;
    });
}

/** Recorta a coleta: mais recentes primeiro, no máx. `porVeiculo` por fonte. */
function recorte(todas: Noticia[], o: Required<OpcoesNoticias>): Noticia[] {
  const agora = Date.now();
  const conta = new Map<string, number>();
  const out: Noticia[] = [];
  for (const n of todas) {
    if (n.t && agora - n.t >= o.horas * 3.6e6) continue;
    const fonte = n.nome; // G NEWS · <veículo> conta separado por veículo
    const c = conta.get(fonte) ?? 0;
    if (c >= o.porVeiculo) continue;
    conta.set(fonte, c + 1);
    out.push(n);
    if (out.length >= o.total) break;
  }
  return out;
}

export async function getNoticias(opcoes: OpcoesNoticias = NOTICIAS_TELAO): Promise<Noticia[]> {
  const o = { ...NOTICIAS_TELAO, ...opcoes };
  if (!cache || Date.now() - cache.at >= TTL) {
    inflight ??= fetchAll().finally(() => (inflight = null));
    const data = await inflight;
    if (data.length) cache = { at: Date.now(), data };
  }
  return recorte(cache?.data ?? [], o);
}
