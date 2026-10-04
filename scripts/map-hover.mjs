import fs from 'fs';
const file = 'components/telao/brazil-map.tsx';
let content = fs.readFileSync(file, 'utf8');

const imports = `
import { useState, useRef, useEffect } from "react";
import type { PleitoSnapshot } from "@/lib/telao/tse-apuracao";

export function BrazilMap({ uf, onSelect }: { uf: string, onSelect: (uf: string) => void }) {
  const [hoverUf, setHoverUf] = useState<string | null>(null);
  const [candCache, setCandCache] = useState<Record<string, PleitoSnapshot[]>>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (id: string) => {
    setHoverUf(id);
    if (!candCache[id]) {
      fetch(\`/api/telao/candidatos?uf=\${id}\`)
        .then(r => r.json())
        .then(d => setCandCache(prev => ({ ...prev, [id]: d })))
        .catch(() => {});
    }
  };

  const handleMouseLeave = () => setHoverUf(null);
  const handleMouseMove = (e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });

  const renderTooltip = () => {
    if (!hoverUf) return null;
    const data = candCache[hoverUf];
    if (!data) return <div className="map-tooltip" style={{ left: mousePos.x + 15, top: mousePos.y + 15 }}>Carregando...</div>;
    
    // Pegamos governador (0) e senador (1)
    const gov = data.find(p => p.id.startsWith("governador"));
    const sen = data.find(p => p.id.startsWith("senador"));

    return (
      <div className="map-tooltip" style={{ left: mousePos.x + 15, top: mousePos.y + 15, position: 'fixed', zIndex: 9999, background: 'rgba(10,11,20,0.95)', border: '1px solid #7c3aed', padding: '1rem', borderRadius: '12px', pointerEvents: 'none', color: '#fff', width: '300px' }}>
        <h3 style={{ margin: '0 0 10px 0', textTransform: 'uppercase', color: '#a78bfa' }}>{hoverUf} - Governador</h3>
        {gov?.candidatos.slice(0, 3).map(c => (
          <div key={c.n} style={{ fontSize: '12px', marginBottom: '4px' }}>{c.n} - {c.nome} ({c.p})</div>
        ))}
        {gov?.candidatos.length > 3 && <div style={{ fontSize: '10px', color: '#888' }}>+ {gov.candidatos.length - 3} candidatos</div>}
        
        <h3 style={{ margin: '10px 0 5px 0', textTransform: 'uppercase', color: '#a78bfa', fontSize: '12px' }}>Senador</h3>
        {sen?.candidatos.slice(0, 3).map(c => (
          <div key={c.n} style={{ fontSize: '12px', marginBottom: '4px' }}>{c.n} - {c.nome} ({c.p})</div>
        ))}
        {sen?.candidatos.length > 3 && <div style={{ fontSize: '10px', color: '#888' }}>+ {sen.candidatos.length - 3} candidatos</div>}
      </div>
    );
  };
`;

content = content.replace(/export function BrazilMap[\s\S]*?return \(/, imports + '\n  return (\n    <>');
content = content.replace(/<svg /, '<svg onMouseMove={handleMouseMove} ');
content = content.replace(/className=\{uf === "([a-z]{2})" \? "on" \: ""\}/g, 'className={uf === "$1" ? "on" : ""} onMouseEnter={() => handleMouseEnter("$1")} onMouseLeave={handleMouseLeave}');
content = content.replace(/<\/svg>/, '</svg>\n    {renderTooltip()}\n    </>');

fs.writeFileSync(file, content);
console.log("Done");
