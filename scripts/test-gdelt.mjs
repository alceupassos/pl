// Teste de conectividade + parse do índice de imprensa real (GDELT).
// Rode NO SERVIDOR (o IP do dev/sandbox pode estar throttled pelo GDELT):
//   node scripts/test-gdelt.mjs
//   node scripts/test-gdelt.mjs "Outro Nome"
//
// A fórmula aqui espelha lib/sources/gdelt.ts (parseImprensaIndex). Se mexer
// numa, ajuste a outra. O objetivo é confirmar que, do IP do servidor, o GDELT
// devolve JSON e o índice ~100 sai num valor sensato.

const termo = process.argv[2] ?? "Sóstenes Cavalcante";
const params = new URLSearchParams({
  query: `"${termo}"`,
  mode: "timelinevol",
  timespan: "1week",
  format: "json",
});
const url = `https://api.gdeltproject.org/api/v2/doc/doc?${params}`;

console.log(`[test-gdelt] consultando: ${termo}`);
const res = await fetch(url, {
  headers: { "User-Agent": "sostenes-cockpit/1.0 (campaign monitor)" },
});
const body = await res.text();
console.log(`[test-gdelt] HTTP ${res.status} · ${body.length} bytes`);

if (!body.trimStart().startsWith("{")) {
  console.error(`[test-gdelt] ✗ resposta não-JSON (provável throttle):\n${body.slice(0, 160)}`);
  process.exit(1);
}

const data = JSON.parse(body).timeline?.[0]?.data ?? [];
const valores = data.map((d) => d.value).filter((v) => Number.isFinite(v));
console.log(`[test-gdelt] pontos na timeline: ${valores.length}`);
if (valores.length < 3) {
  console.error("[test-gdelt] ✗ poucos pontos — sem sinal de imprensa suficiente.");
  process.exit(1);
}

const sorted = [...valores].sort((a, b) => a - b);
const m = Math.floor(sorted.length / 2);
const mediana = sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
const media = valores.reduce((a, b) => a + b, 0) / valores.length;
const baseline = mediana || media;
const recente = (valores.at(-1) + valores.at(-2)) / 2;
const idx = Math.min(220, Math.max(40, (recente / baseline) * 100));

console.log(`[test-gdelt] recente=${recente.toFixed(4)} baseline=${baseline.toFixed(4)}`);
console.log(`[test-gdelt] ✓ índice de imprensa = ${Math.round(idx * 10) / 10} (100 = cobertura típica da semana)`);
