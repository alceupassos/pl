import fs from 'fs';
const file = 'components/telao/pleitos-wall.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Vitrine (pré-apuração): ordem alfabética
content = content.replace(
  /.sort\(\(a, b\) => Number\(a.fora\) - Number\(b.fora\) \|\| \(b.pct \?\? -1\) - \(a.pct \?\? -1\) \|\| b.c.bens - a.c.bens\)/,
  '.sort((a, b) => Number(a.fora) - Number(b.fora) || a.c.nome.localeCompare(b.c.nome))'
);

// 2. Majoritario e Proporcional: ordem de eleito
content = content.replace(
  /const lista = ap.cand.slice\(0, MAJORITARIO_MAX\);/,
  'const lista = [...ap.cand].sort((a, b) => Number(b.eleito) - Number(a.eleito) || b.votos - a.votos).slice(0, MAJORITARIO_MAX);'
);
content = content.replace(
  /const lista = ap.cand.slice\(0, PROPORCIONAL_MAX\);/,
  'const lista = [...ap.cand].sort((a, b) => Number(b.eleito) - Number(a.eleito) || b.votos - a.votos).slice(0, PROPORCIONAL_MAX);'
);

// 3. EdgeScroller directions
content = content.replace(
  /const startScroll = \(dir: number\) => \{[\s\S]*?const stopScroll =/m,
  `const startScroll = (dirX: number, dirY: number) => {
    cancelAnimationFrame(tRef.current);
    const loop = () => {
      document.querySelectorAll(".pl-tabs, .pl-cenas, .pl-cols, .pl-prop, .pl-bc-grid, .pl-mun-list, .telao.pl-wall, .pl-body").forEach(el => {
        if (dirX !== 0 && el.scrollWidth > el.clientWidth) {
          el.scrollLeft += dirX * 12;
        }
        if (dirY !== 0 && el.scrollHeight > el.clientHeight) {
          el.scrollTop += dirY * 12;
        }
      });
      tRef.current = requestAnimationFrame(loop);
    };
    tRef.current = requestAnimationFrame(loop);
  };
  const stopScroll =`
);

content = content.replace(
  /<div \n        onMouseEnter=\{\(\) => startScroll\(-1\)\}[\s\S]*?<\/div>/m,
  `<div 
        onMouseEnter={() => startScroll(0, -1)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', left: '15%', right: '15%', top: 0, height: '60px', zIndex: 90, cursor: 'n-resize' }} 
      />
      <div 
        onMouseEnter={() => startScroll(0, 1)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', left: '15%', right: '15%', bottom: 0, height: '60px', zIndex: 90, cursor: 's-resize' }} 
      />
      <div 
        onMouseEnter={() => startScroll(-1, 0)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', left: 0, top: '15%', bottom: '15%', width: '80px', zIndex: 90, cursor: 'w-resize' }} 
      />
      <div 
        onMouseEnter={() => startScroll(1, 0)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', right: 0, top: '15%', bottom: '15%', width: '80px', zIndex: 90, cursor: 'e-resize' }} 
      />`
);

fs.writeFileSync(file, content);
console.log("Sort and edge scroll fixed");
