"use client";

/** Linha de progresso do ciclo automático (ex.: 10s). Reinicia com `cycleKey`. */
export function CountdownBar({ ms, cycleKey }: { ms: number; cycleKey: number }) {
  return (
    <div className="m-countdown-track" aria-hidden>
      <span
        key={cycleKey}
        className="m-countdown-fill"
        style={{ animationDuration: `${ms}ms` }}
      />
    </div>
  );
}
