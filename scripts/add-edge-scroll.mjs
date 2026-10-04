import fs from 'fs';
const file = 'components/telao/pleitos-wall.tsx';
let content = fs.readFileSync(file, 'utf8');

const hookCode = `
function EdgeScroller() {
  const tRef = useRef<number>(0);

  const startScroll = (dir: number) => {
    cancelAnimationFrame(tRef.current);
    const loop = () => {
      // seleciona todos que tem overflow-x e tenta rolar
      document.querySelectorAll(".pl-tabs, .pl-cenas, .pl-cols, .pl-prop, .pl-bc-grid").forEach(el => {
        if (el.scrollWidth > el.clientWidth) {
          el.scrollLeft += dir * 12;
        }
      });
      tRef.current = requestAnimationFrame(loop);
    };
    tRef.current = requestAnimationFrame(loop);
  };

  const stopScroll = () => cancelAnimationFrame(tRef.current);

  useEffect(() => stopScroll, []);

  return (
    <>
      <div 
        onMouseEnter={() => startScroll(-1)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', left: 0, top: '15%', bottom: '15%', width: '80px', zIndex: 90, cursor: 'w-resize' }} 
      />
      <div 
        onMouseEnter={() => startScroll(1)} 
        onMouseLeave={stopScroll}
        style={{ position: 'fixed', right: 0, top: '15%', bottom: '15%', width: '80px', zIndex: 90, cursor: 'e-resize' }} 
      />
    </>
  );
}
`;

content = content.replace('export function PleitosWall', hookCode + '\nexport function PleitosWall');
content = content.replace('<Fundo3D />', '<Fundo3D />\n      {!mobile && <EdgeScroller />}');

fs.writeFileSync(file, content);
console.log("Edge scroll added");
