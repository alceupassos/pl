"use client";

// Flash de borda 300ms na cor da direção quando o valor observado muda
// (padrão de trading app). Não remonta os filhos — só alterna classe.

import { useEffect, useRef, useState } from "react";

export function useFlash(value: number | null | undefined): "up" | "down" | null {
  const prevRef = useRef<number | null | undefined>(undefined);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = value;
    if (prev === undefined || prev === null || value === null || value === undefined) return;
    if (value === prev) return;
    const direction = value > prev ? "up" : "down";
    const raf = requestAnimationFrame(() => setFlash(direction));
    const id = window.setTimeout(() => setFlash(null), 320);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [value]);

  return flash;
}

export function FlashCard({
  watch,
  className = "",
  children,
}: {
  /** Valor observado — mudança dispara o flash na direção. */
  watch: number | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  const flash = useFlash(watch);
  return (
    <div className={`m-card ${flash ? `m-flash-${flash}` : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
