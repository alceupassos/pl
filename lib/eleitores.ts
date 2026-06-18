// Eleitores Ativos — captados pelo QR de cada cabo eleitoral. Persistido em
// data/eleitores.jsonl via lib/store.ts. Cada eleitor é vinculado ao cabo (caboId)
// e vira alvo da conversa por IA (boas-vindas + pesquisa + preparação de campanha).

import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import { appendRecord, readRecords, updateRecord, type StoredRecord } from "@/lib/store";

const STORE = "eleitores";
const PREFIX = "ele";

export const EleitorSchema = z.object({
  id: z.string(),
  at: z.string(),
  nome: z.string().min(1),
  whatsapp: z.string().min(1),
  cidade: z.string().optional(),
  caboId: z.string().default(""),
  status: z.enum(["ativo", "inativo"]).default("ativo"),
  optout: z.boolean().default(false),
});
export type Eleitor = z.infer<typeof EleitorSchema>;

function coerce(r: StoredRecord): Eleitor | null {
  const p = EleitorSchema.safeParse(r);
  return p.success ? p.data : null;
}

export async function listEleitores(): Promise<Eleitor[]> {
  const rows = await readRecords(STORE);
  return rows.map(coerce).filter((e): e is Eleitor => e !== null);
}

export async function addEleitor(input: {
  nome: string;
  whatsapp: string;
  cidade?: string;
  caboId?: string;
}): Promise<Eleitor> {
  const rec = await appendRecord(STORE, PREFIX, {
    nome: input.nome,
    whatsapp: input.whatsapp,
    cidade: input.cidade ?? "",
    caboId: input.caboId ?? "",
    status: "ativo",
    optout: false,
  });
  return coerce(rec) as Eleitor;
}

export async function patchEleitor(
  id: string,
  patch: Partial<Pick<Eleitor, "status" | "optout" | "cidade">>,
): Promise<Eleitor | null> {
  const updated = await updateRecord(STORE, id, patch as Record<string, unknown>);
  return updated ? coerce(updated) : null;
}

export async function getEleitor(id: string): Promise<Eleitor | null> {
  const all = await listEleitores();
  return all.find((e) => e.id === id) ?? null;
}

/** Casa um telefone (inbound) com um eleitor pelo WhatsApp normalizado. */
export async function findEleitorByPhone(phone: string): Promise<Eleitor | null> {
  const alvo = normalizePhone(phone);
  if (!alvo.ok) return null;
  const all = await listEleitores();
  for (const e of all) {
    const n = normalizePhone(e.whatsapp);
    if (n.ok && n.phone === alvo.phone) return e;
  }
  return null;
}

/** Nº de eleitores ativos por cabo. */
export async function countByCabo(): Promise<Record<string, number>> {
  const all = await listEleitores();
  const out: Record<string, number> = {};
  for (const e of all) out[e.caboId] = (out[e.caboId] ?? 0) + 1;
  return out;
}
