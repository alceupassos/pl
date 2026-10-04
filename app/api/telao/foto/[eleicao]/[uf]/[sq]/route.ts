import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { TSE_BASE } from "@/lib/telao/tse-apuracao";

export const dynamic = "force-dynamic";

// Proxy + cache em disco das fotos oficiais do TSE. Nada é baixado em lote:
// a foto só é buscada na 1ª vez que o telão exibe aquele candidato (os mais
// votados, conforme a apuração avança) e depois sai de data/tse-fotos/.
const DIR = path.join(process.cwd(), "data", "tse-fotos");
const ELEICOES = new Set(["6257", "6259"]);

type Params = { eleicao: string; uf: string; sq: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { eleicao, uf, sq } = await ctx.params;
  if (!ELEICOES.has(eleicao) || !/^[a-z]{2}$/.test(uf) || !/^\d{9,15}$/.test(sq)) {
    return new Response("not found", { status: 404 });
  }
  const file = path.join(DIR, `${eleicao}-${uf}-${sq}.jpeg`);
  const headers = { "content-type": "image/jpeg", "cache-control": "public, max-age=86400, immutable" };

  try {
    return new Response(new Uint8Array(await readFile(file)), { headers });
  } catch {
    /* não está em cache → baixa do TSE */
  }

  try {
    const res = await fetch(`${TSE_BASE}/${eleicao}/fotos/${uf}/${sq}.jpeg`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) {
      return new Response("not found", { status: 404 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(DIR, { recursive: true });
    await writeFile(file, buf).catch(() => {});
    return new Response(new Uint8Array(buf), { headers });
  } catch {
    return new Response("upstream error", { status: 502 });
  }
}
