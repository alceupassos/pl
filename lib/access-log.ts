import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

import { getClientIp } from "@/lib/auth";
import { notifyAccess } from "@/lib/whatsapp-push";

export const ACCESS_ONLINE_MS = 5 * 60 * 1000;

const DATA_DIR = path.join(process.cwd(), "data");
const ACCESS_LOG_FILE = path.join(DATA_DIR, "access-log.jsonl");
const LEADS_LOG_FILE = path.join(DATA_DIR, "transparency-leads.jsonl");

export type AccessLogEntry = {
  at: string;
  event: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  path: string;
  userAgent: string;
  referrer: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
};

export type IpLocation = {
  city: string;
  region: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export function isAccessOnline(lastAccess: string, now = Date.now()): boolean {
  const ts = new Date(lastAccess).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts < ACCESS_ONLINE_MS;
}

function isPrivateIp(ip: string) {
  return (
    ip === "unknown" ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function lookupIpLocation(ip: string): Promise<IpLocation> {
  if (isPrivateIp(ip)) {
    return {
      city: "Local/privado",
      region: "Rede local",
      country: "Desconhecido",
    };
  }

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60 * 60 * 24,
      },
    });

    if (!response.ok) throw new Error("ip_lookup_failed");
    const body = await response.json();

    const latitude =
      typeof body?.latitude === "number" && Number.isFinite(body.latitude)
        ? body.latitude
        : undefined;
    const longitude =
      typeof body?.longitude === "number" && Number.isFinite(body.longitude)
        ? body.longitude
        : undefined;

    return {
      city: typeof body?.city === "string" && body.city ? body.city : "Desconhecida",
      region: typeof body?.region === "string" && body.region ? body.region : "Desconhecida",
      country: typeof body?.country_name === "string" && body.country_name ? body.country_name : "Desconhecido",
      latitude,
      longitude,
    };
  } catch {
    return {
      city: "Não detectada",
      region: "Não detectada",
      country: "Não detectado",
    };
  }
}

export async function appendAccessLog(
  headers: Headers,
  input: {
    event: string;
    path: string;
    metadata?: Record<string, unknown>;
  },
) {
  await ensureDataDir();
  const ip = getClientIp(headers);
  const location = await lookupIpLocation(ip);
  const entry: AccessLogEntry = {
    at: new Date().toISOString(),
    event: input.event,
    ip,
    city: location.city,
    region: location.region,
    country: location.country,
    path: input.path,
    userAgent: headers.get("user-agent") || "unknown",
    referrer: headers.get("referer") || "",
    latitude: location.latitude,
    longitude: location.longitude,
    metadata: input.metadata,
  };

  await appendFile(ACCESS_LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  void notifyAccess(entry).catch(() => undefined);
  return entry;
}

export async function appendLeadLog(input: Record<string, unknown>) {
  await ensureDataDir();
  const entry = {
    at: new Date().toISOString(),
    destinationEmail: "eleicao@angra.io",
    ...input,
  };
  await appendFile(LEADS_LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  return entry;
}

export async function readAccessLogs() {
  try {
    const content = await readFile(ACCESS_LOG_FILE, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AccessLogEntry)
      .sort((a, b) => b.at.localeCompare(a.at));
  } catch {
    return [];
  }
}

export async function summarizeAccessLogs() {
  const logs = await readAccessLogs();
  const byIp = new Map<string, AccessLogEntry & { accessCount: number; lastAccess: string }>();

  for (const log of logs) {
    const current = byIp.get(log.ip);
    if (!current) {
      byIp.set(log.ip, {
        ...log,
        accessCount: 1,
        lastAccess: log.at,
      });
      continue;
    }

    current.accessCount += 1;
    if (log.at > current.lastAccess) {
      current.lastAccess = log.at;
      current.event = log.event;
      current.path = log.path;
      current.userAgent = log.userAgent;
      current.referrer = log.referrer;
      current.city = log.city;
      current.region = log.region;
      current.country = log.country;
      if (typeof log.latitude === "number") current.latitude = log.latitude;
      if (typeof log.longitude === "number") current.longitude = log.longitude;
    }
  }

  return {
    totalAccesses: logs.length,
    uniqueIps: byIp.size,
    entries: Array.from(byIp.values()).sort((a, b) => b.lastAccess.localeCompare(a.lastAccess)),
    rawLogs: logs,
  };
}
