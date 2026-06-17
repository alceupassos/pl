// Histórico de conversas WhatsApp com a rede de campanha (cobrança por IA).
// Persistido em data/conversas.jsonl via lib/store.ts. `direcao`: "out" = enviado
// pela campanha/IA; "in" = recebido do membro.

import { appendRecord, readRecords, type StoredRecord } from "@/lib/store";

const STORE = "conversas";
const PREFIX = "conv";

export type Conversa = StoredRecord & {
  membroId: string;
  telefone: string;
  direcao: "in" | "out";
  texto: string;
  via?: string; // "manual" | "agendado" | "ia" | "inbound"
};

export async function logConversa(
  membroId: string,
  telefone: string,
  direcao: "in" | "out",
  texto: string,
  via?: string,
): Promise<void> {
  await appendRecord(STORE, PREFIX, { membroId, telefone, direcao, texto, via });
}

/** Histórico de um membro em ordem cronológica (mais antigo → mais novo). */
export async function historicoDoMembro(membroId: string, limit = 20): Promise<Conversa[]> {
  const rows = (await readRecords<Conversa>(STORE)).filter((c) => c.membroId === membroId);
  // readRecords vem desc (mais novo primeiro); pega os N mais novos e ordena asc.
  return rows.slice(0, limit).reverse();
}

/** Última cobrança ENVIADA (out) para um membro — usado p/ anti-spam no agendado. */
export async function ultimaCobranca(membroId: string): Promise<Conversa | null> {
  const rows = (await readRecords<Conversa>(STORE)).filter(
    (c) => c.membroId === membroId && c.direcao === "out",
  );
  return rows[0] ?? null; // desc → o primeiro é o mais novo
}
