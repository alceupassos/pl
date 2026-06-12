// Smoke test das fontes reais (composer.md) — roda com: node scripts/validate-sources.mjs

import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

async function testCamaraPlenario() {
  const base = "https://dadosabertos.camara.leg.br/api/v2";
  const votRes = await fetch(`${base}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=1`);
  if (!votRes.ok) return { ok: false, err: `votacoes ${votRes.status}` };
  const votJson = await votRes.json();
  const ultima = votJson.dados?.[0];
  if (!ultima?.id) return { ok: false, err: "sem votacao" };
  const votosRes = await fetch(`${base}/votacoes/${ultima.id}/votos?itens=50`);
  const votosJson = votosRes.ok ? await votosRes.json() : { dados: [] };
  const depRes = await fetch(`${base}/deputados/178947/votacoes?itens=3`);
  const depJson = depRes.ok ? await depRes.json() : { dados: [] };
  return {
    ok: true,
    votacaoId: ultima.id,
    titulo: String(ultima.descricao ?? "").slice(0, 80),
    votosCount: votosJson.dados?.length ?? 0,
    depVotos: depJson.dados?.length ?? 0,
  };
}

async function testSidecar(path) {
  try {
    const res = await fetch(`http://127.0.0.1:8088${path}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, err: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, json };
  } catch (e) {
    return { ok: false, err: String(e.message ?? e) };
  }
}

async function main() {
  const results = {};

  results.camara = await testCamaraPlenario();

  const cacheFiles = [
    "plenario-cache.json",
    "youtube-videos-cache.json",
    "trends-cache.json",
    "youtube-cache.json",
    "camara-cache.json",
  ];
  results.caches = Object.fromEntries(
    cacheFiles.map((f) => [f, existsSync(join(root, "data", f))]),
  );

  results.sidecarHealth = await testSidecar("/health");
  results.sidecarYoutubeVideos = await testSidecar(
    "/youtube/videos?channel=" +
      encodeURIComponent("https://www.youtube.com/channel/UCI2j76o7JyLVSmooEcSvLxA") +
      "&n=2",
  );
  results.sidecarTrends = await testSidecar("/trends?termo=S%C3%B3stenes%20Cavalcante");

  console.log(JSON.stringify(results, null, 2));
}

main();
