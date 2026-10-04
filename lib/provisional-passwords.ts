import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ProvisionalCredential = {
  login: string;
  password: string;
  validUntil: string;
  maxIps?: number;
};

const PASSWORD_FILE = path.join(process.cwd(), "senhas.md");
const BINDINGS_FILE = path.join(process.cwd(), "data", "provisional-credential-ip-bindings.json");

export async function findProvisionalCredential(login: string, password: string) {
  try {
    const content = await readFile(PASSWORD_FILE, "utf8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("|") || trimmed.startsWith("| ---") || trimmed.startsWith("| Login")) continue;
      const columns = trimmed
        .split("|")
        .map((column) => column.trim())
        .filter(Boolean);
      if (columns.length < 3) continue;

      const credential: ProvisionalCredential = {
        login: columns[0] || "",
        password: columns[1] || "",
        validUntil: columns[2] || "",
        maxIps: columns[3] ? parseInt(columns[3], 10) || 1 : 1,
      };

      if (credential.login !== login || credential.password !== password) continue;

      const expiresAt = Date.parse(credential.validUntil);
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        return null;
      }

      return credential;
    }
  } catch {
    return null;
  }

  return null;
}

type IpBinding = { ips: string[]; firstUsedAt: string; lastUsedAt: string };

async function readBindings() {
  try {
    const content = await readFile(BINDINGS_FILE, "utf8");
    const raw = JSON.parse(content) as Record<string, unknown>;
    const result: Record<string, IpBinding> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value && typeof value === "object") {
        const v = value as Record<string, unknown>;
        result[key] = {
          ips: Array.isArray(v.ips) ? (v.ips as string[]) : v.ip ? [v.ip as string] : [],
          firstUsedAt: typeof v.firstUsedAt === "string" ? v.firstUsedAt : new Date().toISOString(),
          lastUsedAt: typeof v.lastUsedAt === "string" ? v.lastUsedAt : new Date().toISOString(),
        };
      }
    }
    return result;
  } catch {
    return {} as Record<string, IpBinding>;
  }
}

async function writeBindings(bindings: Record<string, IpBinding>) {
  await mkdir(path.dirname(BINDINGS_FILE), { recursive: true });
  await writeFile(BINDINGS_FILE, `${JSON.stringify(bindings, null, 2)}\n`, "utf8");
}

export async function verifyProvisionalCredentialForIp(login: string, password: string, ip: string) {
  const credential = await findProvisionalCredential(login, password);
  if (!credential) {
    return {
      ok: false,
      reason: "invalid_or_expired",
      credential: null,
    } as const;
  }

  const maxIps = credential.maxIps ?? 1;
  const bindings = await readBindings();
  const current = bindings[credential.login];
  const now = new Date().toISOString();

  if (current) {
    if (!current.ips.includes(ip) && current.ips.length >= maxIps) {
      return {
        ok: false,
        reason: "ip_mismatch",
        credential,
        boundIp: current.ips[0],
      } as const;
    }

    const updatedIps = current.ips.includes(ip) ? current.ips : [...current.ips, ip];
    bindings[credential.login] = {
      ips: updatedIps,
      firstUsedAt: current.firstUsedAt,
      lastUsedAt: now,
    };
  } else {
    bindings[credential.login] = {
      ips: [ip],
      firstUsedAt: now,
      lastUsedAt: now,
    };
  }

  await writeBindings(bindings);

  return {
    ok: true,
    reason: "ok",
    credential,
  } as const;
}
