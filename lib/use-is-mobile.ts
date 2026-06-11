"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 768px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Hook de viewport mobile (≤768px) — false no SSR. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
