import fs from 'fs';
const f = 'status.md';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/> Última atualização:.*$/m, '> Última atualização: **2026-10-04T05:46:30-03:00**');

const newRows = `| \`[x]\` | **15. Inteligência de Ordenação e UX Visual** | Vitrine alterada para ordenar por Ordem Alfabética antes da apuração, e por Status de "Eleito" depois. Adicionadas rolagem Vertical no EdgeScroller. Lente de notícias ajustada para *dark milk* e blur. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css) |
| \`[x]\` | **16. Deploy em Produção** | Commit integral e implantação feita no servidor \`169.58.71.28\` (\`/opt/pl\`). Build executado via Turbopack e PM2 recarregado. | — |`;

c = c.replace(/app\/globals\.css\) \|/m, 'app/globals.css) |\n' + newRows);
fs.writeFileSync(f, c);
console.log("status.md updated");
