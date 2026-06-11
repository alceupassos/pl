// Web Push do /m — server-only. Sem chaves VAPID nas envs, vira no-op
// gracioso (um aviso único no log). Subscriptions persistem em
// data/push-subscriptions.jsonl via lib/store.ts.

import webpush from "web-push";

import { appendRecord, readRecords, updateRecord, type StoredRecord } from "@/lib/store";

const STORE = "push-subscriptions";

type PushSubRecord = StoredRecord & {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  revoked?: boolean;
};

let configured: boolean | null = null;
let warned = false;

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    if (!warned) {
      warned = true;
      console.warn("[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ausentes — web push desativado");
    }
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:eleicao@angra.io",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return ensureConfigured() ? (process.env.VAPID_PUBLIC_KEY ?? null) : null;
}

export async function saveSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<void> {
  const existing = await readRecords<PushSubRecord>(STORE);
  const found = existing.find((r) => r.endpoint === sub.endpoint);
  if (found) {
    if (found.revoked) await updateRecord(STORE, found.id, { revoked: false, keys: sub.keys });
    return;
  }
  await appendRecord(STORE, "psub", sub);
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const existing = await readRecords<PushSubRecord>(STORE);
  const found = existing.find((r) => r.endpoint === endpoint);
  if (found) await updateRecord(STORE, found.id, { revoked: true });
}

// dedupe entre conexões SSE concorrentes (ids determinísticos do mock)
const sentIds = new Set<string>();

export type PushPayload = { id: string; titulo: string; corpo: string; tab?: string };

/** Envia para todas as subscriptions ativas; remove as mortas (404/410). */
export async function sendPushToAll(payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  if (sentIds.has(payload.id)) return;
  sentIds.add(payload.id);
  if (sentIds.size > 500) {
    // poda simples — ids são por-dia, não acumulam para sempre
    const keep = [...sentIds].slice(-200);
    sentIds.clear();
    keep.forEach((id) => sentIds.add(id));
  }

  const subs = (await readRecords<PushSubRecord>(STORE)).filter((s) => !s.revoked);
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          JSON.stringify(payload),
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await updateRecord(STORE, sub.id, { revoked: true });
        }
      }
    }),
  );
}
