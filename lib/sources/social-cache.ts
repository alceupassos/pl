// Cache persistente de perfis sociais — Postgres-first, fallback JSON local.
// Evita gastar créditos Bright Data/Kondado a cada tick do SSE.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type SocialNetwork = "instagram" | "facebook" | "x" | "tiktok" | "linkedin" | "youtube";

export type CachedProfile = {
  network: SocialNetwork;
  handle: string;
  followers: number;
  username: string;
  displayName: string | null;
  source: string;
  fetchedAt: number;
  expiresAt: number;
};

const TTL_MS =
  Math.max(1, Number.parseInt(process.env.SOCIAL_CACHE_TTL_HOURS ?? "12", 10)) * 60 * 60 * 1000;
const STALE_MS =
  Math.max(TTL_MS, Number.parseInt(process.env.SOCIAL_CACHE_STALE_HOURS ?? "168", 10)) * 60 * 60 * 1000;
const JSON_FILE = join(process.cwd(), "data", "social-profile-cache.json");

type JsonStore = Record<string, CachedProfile>;

let jsonStore: JsonStore = {};
let pgReady: boolean | null = null;
let pgPool: import("pg").Pool | null = null;

(function loadJson() {
  try {
    jsonStore = JSON.parse(readFileSync(JSON_FILE, "utf8")) as JsonStore;
  } catch {
    jsonStore = {};
  }
})();

function key(network: SocialNetwork, handle: string): string {
  return `${network}:${handle.trim().toLowerCase().replace(/^@/, "")}`;
}

function normHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

async function getPool(): Promise<import("pg").Pool | null> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (pgReady === false) return null;
  if (pgPool) return pgPool;
  try {
    const { Pool } = await import("pg");
    pgPool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 30_000 });
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS social_profile_cache (
        network TEXT NOT NULL,
        handle TEXT NOT NULL,
        followers INTEGER,
        username TEXT,
        display_name TEXT,
        source TEXT NOT NULL,
        raw JSONB,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (network, handle)
      );
      CREATE INDEX IF NOT EXISTS social_profile_cache_expires_idx
        ON social_profile_cache (expires_at);
    `);
    pgReady = true;
    return pgPool;
  } catch {
    pgReady = false;
    pgPool = null;
    return null;
  }
}

export function isFresh(entry: CachedProfile | null | undefined): boolean {
  if (!entry?.followers || !Number.isFinite(entry.followers)) return false;
  return entry.expiresAt > Date.now();
}

export function isUsableStale(entry: CachedProfile | null | undefined): boolean {
  if (!entry?.followers || !Number.isFinite(entry.followers)) return false;
  return entry.fetchedAt + STALE_MS > Date.now();
}

export async function getCachedProfile(
  network: SocialNetwork,
  handle: string,
): Promise<CachedProfile | null> {
  const h = normHandle(handle);
  if (!h) return null;
  const pool = await getPool();
  if (pool) {
    try {
      const res = await pool.query<{
        network: string;
        handle: string;
        followers: number | null;
        username: string | null;
        display_name: string | null;
        source: string;
        fetched_at: Date;
        expires_at: Date;
      }>(
        `SELECT network, handle, followers, username, display_name, source, fetched_at, expires_at
         FROM social_profile_cache WHERE network = $1 AND handle = $2`,
        [network, h],
      );
      const row = res.rows[0];
      if (!row || row.followers == null) return null;
      const entry: CachedProfile = {
        network,
        handle: h,
        followers: row.followers,
        username: row.username ?? h,
        displayName: row.display_name,
        source: row.source,
        fetchedAt: row.fetched_at.getTime(),
        expiresAt: row.expires_at.getTime(),
      };
      jsonStore[key(network, h)] = entry;
      return entry;
    } catch {
      /* fallback json */
    }
  }
  return jsonStore[key(network, h)] ?? null;
}

export async function setCachedProfile(input: {
  network: SocialNetwork;
  handle: string;
  followers: number;
  username?: string;
  displayName?: string | null;
  source: string;
  raw?: unknown;
}): Promise<void> {
  const h = normHandle(input.handle);
  if (!h || !Number.isFinite(input.followers)) return;
  const now = Date.now();
  const entry: CachedProfile = {
    network: input.network,
    handle: h,
    followers: input.followers,
    username: input.username ?? h,
    displayName: input.displayName ?? null,
    source: input.source,
    fetchedAt: now,
    expiresAt: now + TTL_MS,
  };

  const pool = await getPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO social_profile_cache
          (network, handle, followers, username, display_name, source, raw, fetched_at, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,to_timestamp($8/1000.0),to_timestamp($9/1000.0))
         ON CONFLICT (network, handle) DO UPDATE SET
          followers = EXCLUDED.followers,
          username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          source = EXCLUDED.source,
          raw = EXCLUDED.raw,
          fetched_at = EXCLUDED.fetched_at,
          expires_at = EXCLUDED.expires_at`,
        [
          input.network,
          h,
          input.followers,
          entry.username,
          entry.displayName,
          input.source,
          input.raw ? JSON.stringify(input.raw) : null,
          now,
          entry.expiresAt,
        ],
      );
    } catch {
      /* json fallback below */
    }
  }

  jsonStore[key(input.network, h)] = entry;
  persistJson();
}

function persistJson(): void {
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    writeFileSync(JSON_FILE, `${JSON.stringify(jsonStore)}\n`);
  } catch {
    /* FS read-only */
  }
}

export function getCachedProfileSync(network: SocialNetwork, handle: string): CachedProfile | null {
  const h = normHandle(handle);
  if (!h) return null;
  return jsonStore[key(network, h)] ?? null;
}

/** Sincroniza memória JSON após leitura async do Postgres (warm-up opcional). */
export async function warmJsonFromPostgres(network: SocialNetwork, handles: string[]): Promise<void> {
  for (const raw of handles) {
    const cached = await getCachedProfile(network, raw);
    if (cached) jsonStore[key(network, normHandle(raw))] = cached;
  }
}
