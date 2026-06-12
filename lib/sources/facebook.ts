// Seguidores reais da página Facebook do candidato — Graph API via sidecar.
// META_ACCESS_TOKEN + META_FB_PAGE_ID no env. Concorrentes FB seguem modelados.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SIDECAR_BASE = (process.env.SENTIMENT_URL ?? "http://127.0.0.1:8088/sentiment").replace(
  /\/sentiment$/,
  "",
);
const TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 20_000;
const CACHE_FILE = join(process.cwd(), "data", "facebook-cache.json");

type State = { at: number; followers: number | null; nome: string | null };

let state: State = { at: 0, followers: null, nome: null };
let inFlight = false;

(function loadDisk() {
  try {
    const raw = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (raw && ("followers" in raw || "nome" in raw)) {
      state = { at: 0, followers: raw.followers ?? null, nome: raw.nome ?? null };
    }
  } catch {
    /* primeira execução */
  }
})();

export function getFacebookFollowers(): number | null {
  return state.followers;
}

export function ensureFreshFacebook(): void {
  if (inFlight) return;
  if (Date.now() - state.at < TTL_MS && state.followers !== null) return;
  inFlight = true;
  void refresh().finally(() => {
    inFlight = false;
  });
}

async function refresh(): Promise<void> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${SIDECAR_BASE}/facebook`, { signal: ctrl.signal });
      if (!res.ok) return;
      const json = (await res.json()) as { followers?: number | null; nome?: string | null };
      if (typeof json.followers === "number" && Number.isFinite(json.followers)) {
        state = { at: Date.now(), followers: json.followers, nome: json.nome ?? null };
        persist();
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    /* sidecar indisponível */
  }
}

function persist(): void {
  try {
    writeFileSync(CACHE_FILE, `${JSON.stringify({ followers: state.followers, nome: state.nome })}\n`);
  } catch {
    /* FS read-only */
  }
}
