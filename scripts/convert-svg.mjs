import fs from 'fs';
const svg = fs.readFileSync('public/brazil-map.svg', 'utf8');
let jsx = svg.replace(/class=/g, 'className=')
             .replace(/viewBox/g, 'viewBox')
             .replace(/stroke-linejoin/g, 'strokeLinejoin')
             .replace(/stroke-width/g, 'strokeWidth')
             .replace(/vector-effect/g, 'vectorEffect');

// We want to add onClick and dynamic className to paths
jsx = jsx.replace(/<path\s+id="([a-z]{2})"/g, '<path id="$1" onClick={() => onSelect("$1")} className={uf === "$1" ? "on" : ""}');

const component = `
export function BrazilMap({ uf, onSelect }: { uf: string, onSelect: (uf: string) => void }) {
  return (
    ${jsx}
  );
}
`;

fs.writeFileSync('components/telao/brazil-map.tsx', component);
console.log("Done");
