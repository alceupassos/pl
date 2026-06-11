"use client";

// Odômetro: count-up suave entre valores (rAF + ease-out cúbico).
// Mono tabular obrigatório — o número não pode "tremer" ao rolar dígitos.

import { useEffect, useRef, useState } from "react";

export function useOdometer(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      fromRef.current = target;
      rafRef.current = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(rafRef.current);
    }
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - p) ** 3;
      setDisplay(from + (target - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);

  return display;
}

export function Odometer({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  signed = false,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Prefixa + quando positivo (variações). */
  signed?: boolean;
}) {
  const display = useOdometer(value);
  const sign = signed && display > 0 ? "+" : "";
  return (
    <span className={`m-mono ${className}`.trim()}>
      {prefix}
      {sign}
      {display.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
