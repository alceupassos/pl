import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { UFS, UF_NOME } from "./ufs";
import { lookupIpLocation } from "@/lib/access-log";
import { getClientIp } from "@/lib/auth";
type Visit = { key: string; uf: string; city: string; at: number };
const file = path.join(process.cwd(), "data", "presence.json");
let queue: Promise<unknown> = Promise.resolve();
async function rows(): Promise<Visit[]> { try { return JSON.parse(await readFile(file, "utf8")); } catch { return []; } }
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export async function heartbeat(account: string, headers: Headers) {
 const location = await lookupIpLocation(getClientIp(headers));
 const uf = UFS.find(u => norm(location.region) === norm(UF_NOME[u]) || norm(location.region) === u) ?? "unknown";
 const key = createHash("sha256").update(account).digest("hex");
 const action = queue.catch(() => {}).then(async () => {
   const data = await rows(), at = Date.now();
   const existing = data.find(v => v.key === key && v.uf === uf && v.city === location.city);
   if (existing) existing.at = at; else data.push({ key, uf, city: location.city, at });
   await mkdir(path.dirname(file), { recursive: true }); await writeFile(`${file}.tmp`, JSON.stringify(data)); await rename(`${file}.tmp`, file);
 }); queue = action; await action;
}
export async function presenceSummary() {
 const data = await rows(), now = Date.now();
 const groups = [...new Set(data.map(v => v.uf))].map(uf => {
  const visits = data.filter(v => v.uf === uf);
  return { uf, total: new Set(visits.map(v => v.key)).size, online: new Set(visits.filter(v => now-v.at < 120000).map(v => v.key)).size,
    cities: [...new Set(visits.map(v => v.city))].map(city => ({ city, total: new Set(visits.filter(v => v.city === city).map(v => v.key)).size, online: new Set(visits.filter(v => v.city === city && now-v.at < 120000).map(v => v.key)).size })) };
 });
 return { groups, total: new Set(data.map(v => v.key)).size, online: new Set(data.filter(v => now-v.at < 120000).map(v => v.key)).size, since: data.length ? new Date(Math.min(...data.map(v=>v.at))).toISOString() : null, definition: "Registros únicos por navegador desde a ativação do monitor; online = sinal nos últimos 2 minutos. Localização por IP é aproximada. Um usuário em mais de um navegador pode contar mais de uma vez. Histórico antigo de IPs não é convertido em pessoas." };
}
