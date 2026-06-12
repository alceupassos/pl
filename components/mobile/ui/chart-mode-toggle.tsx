"use client";

// Alterna visualização candlestick ↔ linha nos gráficos do ticker.

export type ChartMode = "candle" | "line";

export function ChartModeToggle({
  mode,
  onChange,
}: {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}) {
  return (
    <div
      className="m-chart-toggle"
      role="group"
      aria-label="Tipo de gráfico"
      data-no-swipe
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={mode === "candle" ? "on" : ""}
        aria-pressed={mode === "candle"}
        onClick={() => onChange("candle")}
      >
        ▮▮
      </button>
      <button
        type="button"
        className={mode === "line" ? "on" : ""}
        aria-pressed={mode === "line"}
        onClick={() => onChange("line")}
      >
        〰
      </button>
    </div>
  );
}
