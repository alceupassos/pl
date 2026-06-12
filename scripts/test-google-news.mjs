// Teste do feed de imprensa real (Google News RSS). Roda em qualquer lugar
// (não tem o throttle do GDELT):
//   node scripts/test-google-news.mjs
//   node scripts/test-google-news.mjs "Outro Nome"
//
// Espelha a lógica de lib/sources/google-news.ts (volume diário → índice ~100).

import { XMLParser } from "fast-xml-parser";

const termo = process.argv[2] ?? "Sóstenes Cavalcante";
const params = new URLSearchParams({ q: `"${termo}"`, hl: "pt-BR", gl: "BR", ceid: "BR:pt" });
const url = `https://news.google.com/rss/search?${params}`;

console.log(`[gnews] consultando: ${termo}`);
const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
const xml = await res.text();
console.log(`[gnews] HTTP ${res.status} · ${xml.length} bytes`);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const raw = parser.parse(xml)?.rss?.channel?.item ?? [];
const itens = Array.isArray(raw) ? raw : [raw];
const datas = itens.map((i) => Date.parse(i.pubDate)).filter((t) => Number.isFinite(t));
console.log(`[gnews] itens: ${itens.length} · com data: ${datas.length}`);
if (datas.length < 5) {
  console.error("[gnews] ✗ poucos itens com data — sinal insuficiente.");
  process.exit(1);
}

const DIA = 24 * 60 * 60 * 1000;
const maxT = Math.max(...datas);
const minT = Math.min(...datas);
const spanDias = Math.max(1, (maxT - minT) / DIA);
const baselinePorDia = datas.length / spanDias;
const recentePorDia = datas.filter((t) => maxT - t <= 3 * DIA).length / 3;
const idx = Math.min(220, Math.max(40, (recentePorDia / baselinePorDia) * 100));

console.log(`[gnews] últimas 3 manchetes:`);
for (const it of itens.slice(0, 3)) console.log(`   • ${it.title}`);
console.log(`[gnews] janela=${spanDias.toFixed(1)}d · base=${baselinePorDia.toFixed(2)}/d · recente=${recentePorDia.toFixed(2)}/d`);
console.log(`[gnews] ✓ índice de imprensa = ${Math.round(idx * 10) / 10} (100 = ritmo normal)`);
