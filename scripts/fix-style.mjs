import fs from 'fs';
const f = 'components/telao/brazil-map.tsx';
let content = fs.readFileSync(f, 'utf8');
content = content.replace(/<style>[\s\S]*?<\/style>/, `<style>{\`
		path {
			fill: #0e1f17;
			stroke: #74ffad;
			strokeLinejoin: round;
			strokeWidth: 1.4;
			vectorEffect: non-scaling-stroke;
		}
	\`}</style>`);
fs.writeFileSync(f, content);
console.log("Fixed style block");
