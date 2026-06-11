// IDs das abas do /m — módulo compartilhado server/client (sem "use client":
// valores exportados de client components viram client-references no server).

export const TAB_IDS = ["ticker", "plenario", "rio", "radar", "redes", "c2026"] as const;
export type TabId = (typeof TAB_IDS)[number];
