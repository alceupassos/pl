// Incrementa o "minor" da versão a cada build (roda como `prebuild`).
// O contador vive em data/build-counter.json — FORA do git (gitignored) e
// dentro da pasta persistente do servidor, então sobrevive a cada deploy sem
// conflitar com `git pull`. Resultado no header: v4.1, v4.2, v4.3, …
// O "major" mora no next.config.ts (APP_MAJOR); aqui só mexemos no minor.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "data", "build-counter.json");

function ler() {
  try {
    const minor = JSON.parse(readFileSync(file, "utf8")).minor;
    return Number.isFinite(minor) ? minor : 0;
  } catch {
    return 0; // primeira vez (ou contador apagado) começa do zero
  }
}

const proximo = ler() + 1;
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, `${JSON.stringify({ minor: proximo }, null, 2)}\n`);
console.log(`[bump-version] minor → ${proximo}`);
