"use client";

// "● AO VIVO · há Xs" — ponto verde pulsando; vira âmbar (stale) quando o
// dado atrasa além de 2× a cadência ou a conexão cai. Nunca esconde o valor.

import { useLiveAge, useLiveStatus } from "@/components/mobile/live/use-live";
import type { Channel } from "@/lib/live-schemas";

export function LiveBadge({
  ch,
  cadenceMs = 5000,
  showLabel = false,
}: {
  ch: Channel;
  cadenceMs?: number;
  showLabel?: boolean;
}) {
  const age = useLiveAge(ch);
  const status = useLiveStatus();
  const stale =
    status !== "open" || age < 0 || age * 1000 > Math.max(8000, cadenceMs * 2 + 4000);

  return (
    <span className={`m-live ${stale ? "stale" : ""}`.trim()}>
      <i aria-hidden />
      {showLabel ? "AO VIVO · " : ""}
      {age < 0 ? "conectando" : `há ${age}s`}
    </span>
  );
}
