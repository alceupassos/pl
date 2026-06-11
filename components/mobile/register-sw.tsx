"use client";

// Registra o service worker do /m (escopo /m — não intercepta o desktop).

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/m/sw.js", { scope: "/m" })
      .catch((error) => console.warn("[sw] registro falhou", error));
  }, []);
  return null;
}
