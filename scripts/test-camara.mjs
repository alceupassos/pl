// Teste da cota parlamentar real (Câmara, Dados Abertos). Roda em qualquer
// lugar (API robusta, sem chave, sem throttle):
//   node scripts/test-camara.mjs
// Espelha lib/sources/camara.ts (agregação por categoria/mês do ano corrente).

const ID = 178947; // Sóstenes Cavalcante
const ano = new Date().getFullYear();

const despesas = [];
for (let pagina = 1; pagina <= 6; pagina += 1) {
  const params = new URLSearchParams({
    ano: String(ano),
    itens: "100",
    pagina: String(pagina),
    ordem: "DESC",
    ordenarPor: "dataDocumento",
  });
  const url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${ID}/despesas?${params}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.error(`[camara] HTTP ${res.status} na página ${pagina}`);
    break;
  }
  const dados = (await res.json()).dados ?? [];
  despesas.push(...dados);
  if (dados.length < 100) break;
}

console.log(`[camara] deputado ${ID} · ano ${ano} · lançamentos: ${despesas.length}`);
if (!despesas.length) {
  console.error("[camara] ✗ sem despesas.");
  process.exit(1);
}

const porCat = {};
let total = 0;
for (const d of despesas) {
  const v = d.valorLiquido || 0;
  if (v <= 0) continue;
  total += v;
  porCat[d.tipoDespesa] = (porCat[d.tipoDespesa] || 0) + v;
}
console.log(`[camara] total gasto: R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
console.log("[camara] top categorias:");
for (const [k, v] of Object.entries(porCat).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
  console.log(`   • ${k.trim()}: R$ ${Math.round(v).toLocaleString("pt-BR")}`);
}
console.log("[camara] ✓ cota parlamentar real disponível.");
