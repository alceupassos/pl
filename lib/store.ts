// Helper CRUD genérico em JSONL para os MVPs do cockpit (mensagens, CRM,
// agenda, diário). Mesmo padrão de persistência de lib/access-log.ts:
// arquivos append-only sob data/, um JSON por linha.

import { mkdir, readFile, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

export type StoredRecord = { id: string; at: string } & Record<string, unknown>;

function fileFor(name: string): string {
  return path.join(DATA_DIR, `${name}.jsonl`);
}

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

/**
 * Gera um id curto e ordenável sem depender de bibliotecas externas.
 * Combina timestamp em base36 com um sufixo derivado do conteúdo.
 */
export function makeId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1_679_616)
    .toString(36)
    .padStart(4, "0");
  return `${prefix}_${ts}${rand}`;
}

/** Acrescenta um registro (com id + timestamp) e o retorna. */
export async function appendRecord(
  name: string,
  prefix: string,
  payload: Record<string, unknown>,
): Promise<StoredRecord> {
  await ensureDataDir();
  const record: StoredRecord = {
    id: makeId(prefix),
    at: new Date().toISOString(),
    ...payload,
  };
  await appendFile(fileFor(name), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/** Lê todos os registros, mais recentes primeiro. */
export async function readRecords<T extends StoredRecord = StoredRecord>(
  name: string,
): Promise<T[]> {
  try {
    const content = await readFile(fileFor(name), "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as T;
        } catch {
          return null;
        }
      })
      .filter((v): v is T => Boolean(v))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  } catch {
    return [];
  }
}

/**
 * Atualiza um registro por id reescrevendo o arquivo inteiro
 * (volumes mockados são pequenos). Retorna o registro atualizado ou null.
 */
export async function updateRecord<T extends StoredRecord = StoredRecord>(
  name: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<T | null> {
  const records = await readRecords<T>(name);
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updated = { ...records[index], ...patch } as T;
  records[index] = updated;
  // Reescreve em ordem cronológica crescente (append-friendly).
  const ordered = [...records].sort((a, b) =>
    String(a.at).localeCompare(String(b.at)),
  );
  await ensureDataDir();
  await writeFile(
    fileFor(name),
    ordered.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  return updated;
}

/** Remove um registro por id (reescreve o arquivo). Retorna true se removeu. */
export async function removeRecord(name: string, id: string): Promise<boolean> {
  const records = await readRecords(name);
  const kept = records.filter((r) => r.id !== id);
  if (kept.length === records.length) return false;
  const ordered = [...kept].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  await ensureDataDir();
  await writeFile(
    fileFor(name),
    ordered.length ? ordered.map((r) => JSON.stringify(r)).join("\n") + "\n" : "",
    "utf8",
  );
  return true;
}
