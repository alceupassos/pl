// Smoke test dos snapshots mobile (composer.md T1–T5) — npx tsx scripts/validate-mobile.mjs

import { snapshotPlenario, snapshotIdx } from "../lib/live-mock.ts";
import { snapshotRedesV2 } from "../lib/live-mock-v2.ts";
import { VOTOS_2022_TOTAL } from "../lib/data/votos-2022-sostenes.ts";
import { getPlenarioReal } from "../lib/sources/plenario.ts";
import { getVideosReal } from "../lib/sources/youtube.ts";
import { hasTrendsReal } from "../lib/sources/trends.ts";
import { DEFAULT_WATCHLIST } from "../lib/watchlist.ts";

const now = Date.now();
const plenario = snapshotPlenario(now);
const redes = snapshotRedesV2(DEFAULT_WATCHLIST, now);
const idx = snapshotIdx(DEFAULT_WATCHLIST, now);

const checks = {
  votos2022: VOTOS_2022_TOTAL === 152763,
  plenarioFonte: plenario.fonte === (getPlenarioReal()?.votacao ? "real" : "modelado"),
  plenarioVotacao: plenario.votacao !== null,
  redesYoutubeVideos: (getVideosReal()?.length ?? 0) > 0 || !redes.youtubeVideos?.length,
  idxMencoesTag: idx.fontes?.mencoes === (hasTrendsReal() ? "real" : "modelado"),
  idxBreakdown: typeof idx.breakdown?.mencoes === "number",
};

const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, plenarioFonte: plenario.fonte, youtubeCount: redes.youtubeVideos?.length ?? 0 }, null, 2));
process.exit(ok ? 0 : 1);
