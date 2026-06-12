// Testa refresh do plenário: node scripts/validate-plenario.mjs

import { ensureFreshPlenario, getPlenarioReal } from "../lib/sources/plenario.ts";

ensureFreshPlenario();
await new Promise((r) => setTimeout(r, 12_000));
const real = getPlenarioReal();
console.log(JSON.stringify(real, null, 2));
