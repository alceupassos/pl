// Rede de campanha REAL (Organizadores de Eleitores) — cadastro persistido em
// data/organizadores.jsonl via lib/store.ts. Substitui/complementa o mock
// lib/mock/organizers.ts na seção Organizadores. Cada membro tem metas, avanços,
// WhatsApp e status; serve de base para a cobrança por IA (lib/whatsapp-push).

import { z } from "zod";

import { normalizePhone } from "@/lib/phone";
import {
  appendRecord,
  readRecords,
  removeRecord,
  updateRecord,
  type StoredRecord,
} from "@/lib/store";

export const NIVEIS = ["church-leader", "regional-manager", "state-deputy", "cabo"] as const;
export type Nivel = (typeof NIVEIS)[number];

export const NIVEL_LABEL: Record<Nivel, string> = {
  "church-leader": "Líder religioso",
  "regional-manager": "Gerente",
  "state-deputy": "Deputado estadual",
  cabo: "Cabo eleitoral",
};

const STORE = "organizadores";
const PREFIX = "org";

const MetaSchema = z.object({
  lista: z.number().nonnegative().default(0),
  cadastro: z.number().nonnegative().default(0),
  engajado: z.number().nonnegative().default(0),
});

export const MembroSchema = z.object({
  id: z.string(),
  at: z.string(),
  nome: z.string().min(1),
  nivel: z.enum(NIVEIS),
  regiao: z.string().default(""),
  parentId: z.string().optional(),
  whatsapp: z.string().default(""),
  email: z.string().optional(),
  metas: MetaSchema.default({ lista: 0, cadastro: 0, engajado: 0 }),
  avancos: MetaSchema.default({ lista: 0, cadastro: 0, engajado: 0 }),
  status: z.enum(["ativo", "atencao", "inativo"]).default("ativo"),
  obs: z.string().optional(),
  optout: z.boolean().default(false), // true = não receber cobrança por WhatsApp
});
export type Membro = z.infer<typeof MembroSchema>;

// Payload de criação/edição (sem id/at, tudo opcional menos nome/nivel na criação).
const InputSchema = MembroSchema.omit({ id: true, at: true }).partial().extend({
  nome: z.string().min(1).optional(),
  nivel: z.enum(NIVEIS).optional(),
});
export type MembroInput = z.infer<typeof InputSchema>;

function coerce(r: StoredRecord): Membro | null {
  const parsed = MembroSchema.safeParse(r);
  return parsed.success ? parsed.data : null;
}

export async function listMembros(): Promise<Membro[]> {
  const rows = await readRecords(STORE);
  return rows.map(coerce).filter((m): m is Membro => m !== null);
}

export async function addMembro(input: MembroInput): Promise<Membro> {
  const data = InputSchema.parse(input);
  const rec = await appendRecord(STORE, PREFIX, {
    nome: data.nome ?? "Sem nome",
    nivel: data.nivel ?? "cabo",
    regiao: data.regiao ?? "",
    parentId: data.parentId,
    whatsapp: data.whatsapp ?? "",
    email: data.email,
    metas: data.metas ?? { lista: 0, cadastro: 0, engajado: 0 },
    avancos: data.avancos ?? { lista: 0, cadastro: 0, engajado: 0 },
    status: data.status ?? "ativo",
    obs: data.obs,
    optout: data.optout ?? false,
  });
  return coerce(rec) as Membro;
}

export async function patchMembro(id: string, patch: MembroInput): Promise<Membro | null> {
  const data = InputSchema.parse(patch);
  const updated = await updateRecord(STORE, id, data as Record<string, unknown>);
  return updated ? coerce(updated) : null;
}

export async function deleteMembro(id: string): Promise<boolean> {
  return removeRecord(STORE, id);
}

export async function getMembro(id: string): Promise<Membro | null> {
  const all = await listMembros();
  return all.find((m) => m.id === id) ?? null;
}

/** Casa um telefone recebido (inbound) com um membro pelo WhatsApp normalizado. */
export async function findMembroByPhone(phone: string): Promise<Membro | null> {
  const alvo = normalizePhone(phone);
  if (!alvo.ok) return null;
  const all = await listMembros();
  for (const m of all) {
    const n = normalizePhone(m.whatsapp);
    if (n.ok && n.phone === alvo.phone) return m;
  }
  return null;
}

/** % de atingimento da meta de cadastro (principal indicador de cobrança). */
export function pctCadastro(m: Membro): number {
  const meta = m.metas?.cadastro ?? 0;
  if (meta <= 0) return 0;
  return Math.round(((m.avancos?.cadastro ?? 0) / meta) * 100);
}
