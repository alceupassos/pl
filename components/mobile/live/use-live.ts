"use client";

// Hooks finos sobre o LiveStore — cada componente assina só o seu canal.

import { useSyncExternalStore } from "react";

import { useLiveStore } from "@/components/mobile/live/provider";
import type { ChannelState, LiveStatus } from "@/components/mobile/live/store";
import type { Channel } from "@/lib/live-schemas";

/** Estado vivo de um canal. Re-renderiza apenas quando o canal muda. */
export function useLiveChannel<T>(ch: Channel): ChannelState<T> {
  const store = useLiveStore();
  return useSyncExternalStore(
    (listener) => store.subscribe(ch, listener),
    () => store.getChannel(ch),
    () => store.getChannel(ch),
  ) as ChannelState<T>;
}

/** Status da conexão SSE (connecting | open | stale). */
export function useLiveStatus(): LiveStatus {
  const store = useLiveStore();
  return useSyncExternalStore(
    (listener) => store.subscribe("@status", listener),
    () => store.getStatus(),
    () => "connecting" as const,
  );
}

/* Relógio compartilhado de 1s — fonte externa para useSyncExternalStore. */
function subscribeClock(listener: () => void): () => void {
  const id = window.setInterval(listener, 1000);
  return () => window.clearInterval(id);
}
function clockSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Idade do último dado do canal, em segundos (re-render 1×/s — use só em
 * quem exibe "há Xs"). Retorna -1 enquanto não chegou nada.
 */
export function useLiveAge(ch: Channel): number {
  const { lastAt } = useLiveChannel(ch);
  const now = useSyncExternalStore(subscribeClock, clockSeconds, clockSeconds);
  if (!lastAt) return -1;
  return Math.max(0, now - Math.floor(lastAt / 1000));
}
