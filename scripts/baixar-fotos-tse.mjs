#!/usr/bin/env node
// Baixa em lote as fotos oficiais dos candidatos 2026 (resultados.tse.jus.br)
// para data/tse-fotos/<eleicao>-<uf>-<sq>.jpeg — o mesmo cache usado pelo
// proxy /api/telao/foto. A lista de candidatos vem dos JSONs "dados/…-u.json"
// que o TSE pré-publica (zerados) antes da apuração; ela fica em cache em
// data/tse-fotos/_listas/ para que uma nova execução não precise rebaixá-la.
//
// O CDN do TSE devolve 429 quando apertamos demais: o script espera o
// retry-after (ou 30s) e continua. Pode ser interrompido e rodado de novo —
// fotos já baixadas são puladas.
//
// Uso:  node scripts/baixar-fotos-tse.mjs            → SP (gov, sen, dep fed, dep est) + presidente
//       node scripts/baixar-fotos-tse.mjs rj mg       → outras UFs
//       node scripts/baixar-fotos-tse.mjs todas       → as 27 UFs + presidente
//       CONC=2 PAUSA=400 node scripts/…               → mais devagar
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://resultados.tse.jus.br/oficial/ele2026";
const DIR = path.join(process.cwd(), "data", "tse-fotos");
const DIR_LISTAS = path.join(DIR, "_listas");
const UFS_TODAS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split(" ");
const CONC = Number(process.env.CONC || 3);
const PAUSA = Number(process.env.PAUSA || 150); // ms entre requisições de cada worker
const TENTATIVAS = 8;

const args = process.argv.slice(2).map((a) => a.toLowerCase());
const ufs = args.includes("todas") ? UFS_TODAS : args.length ? args : ["sp"];
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// pausa global: quando qualquer worker toma 429, todos esperam
let pausaAte = 0;
async function respeitarPausa() {
  while (Date.now() < pausaAte) await dormir(pausaAte - Date.now());
}
function marcar429(r) {
  const ra = Number(r.headers.get("retry-after"));
  const ms = (Number.isFinite(ra) && ra > 0 ? ra : 30) * 1000;
  if (Date.now() + ms > pausaAte) {
    pausaAte = Date.now() + ms;
    console.warn(`429 do TSE → pausando ${Math.round(ms / 1000)}s`);
  }
}

/** fetch com 429/5xx/timeout tratados. Devolve Response ok, 404/403, ou lança. */
async function buscar(url) {
  let ultimo;
  for (let t = 0; t < TENTATIVAS; t++) {
    await respeitarPausa();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (r.status === 429) {
        marcar429(r);
        ultimo = new Error("429");
        continue;
      }
      if (r.ok || r.status === 404 || r.status === 403) return r;
      ultimo = new Error(String(r.status));
    } catch (e) {
      ultimo = e;
    }
    await dormir(2000 * 2 ** Math.min(t, 4));
  }
  throw ultimo;
}

function sqs(raw) {
  const out = [];
  for (const cg of raw.carg ?? [])
    for (const ag of cg.agr ?? []) for (const p of ag.par ?? []) for (const c of p.cand ?? []) out.push(String(c.sqcand));
  for (const c of raw.cand ?? []) out.push(String(c.sqcand));
  return [...new Set(out.filter((s) => /^\d{9,15}$/.test(s)))];
}

const jobs = []; // { eleicao, uf, sq }
async function listar(eleicao, uf, cargo) {
  const nome = `${eleicao}-${uf}-c${cargo}.json`;
  const cacheFile = path.join(DIR_LISTAS, nome);
  let l;
  try {
    l = JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {
    try {
      const r = await buscar(`${BASE}/${eleicao}/dados/${uf}/${uf}-c${cargo}-e00${eleicao}-u.json`);
      if (!r.ok) throw new Error(String(r.status));
      l = sqs(await r.json());
      await writeFile(cacheFile, JSON.stringify(l));
    } catch (e) {
      console.warn(`falhou lista ${uf} c${cargo}: ${e?.message ?? e}`);
      return;
    }
    await dormir(PAUSA);
  }
  for (const sq of l) jobs.push({ eleicao, uf, sq });
  console.log(`lista ${uf.toUpperCase()} c${cargo}: ${l.length}`);
}

await mkdir(DIR_LISTAS, { recursive: true });
await listar("6257", "br", "0001");
for (const uf of ufs) for (const cargo of ["0003", "0005", "0006", uf === "df" ? "0008" : "0007"]) await listar("6259", uf, cargo);

let ok = 0, skip = 0, miss = 0, err = 0, i = 0, logErros = 10;
const t0 = Date.now();
async function worker() {
  while (i < jobs.length) {
    const { eleicao, uf, sq } = jobs[i++];
    const file = path.join(DIR, `${eleicao}-${uf}-${sq}.jpeg`);
    try {
      if ((await stat(file)).size > 0) { skip++; continue; }
    } catch {}
    try {
      const r = await buscar(`${BASE}/${eleicao}/fotos/${uf}/${sq}.jpeg`);
      if (!r.ok || !r.headers.get("content-type")?.startsWith("image/")) miss++;
      else {
        await writeFile(file, Buffer.from(await r.arrayBuffer()));
        ok++;
      }
    } catch (e) {
      err++;
      if (logErros-- > 0) console.warn(`erro ${uf}/${sq}: ${e?.cause?.code || e?.message || e}`);
    }
    const done = ok + skip + miss + err;
    if (done % 100 === 0)
      console.log(`${done}/${jobs.length}  novas=${ok} já=${skip} sem-foto=${miss} erro=${err}  (${Math.round((Date.now() - t0) / 1000)}s)`);
    await dormir(PAUSA);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`FIM ${jobs.length} candidatos · novas=${ok} já tinha=${skip} sem foto=${miss} erro=${err} → ${DIR}`);
if (err) console.log("Rode de novo para tentar só as que faltaram.");
