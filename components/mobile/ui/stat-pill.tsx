"use client";

// Bloco compacto label + número animado (odômetro) para fileiras de stats.

import { Odometer } from "@/components/mobile/ui/odometer";

const TONE_CLASS: Record<string, string> = {
  up: "m-up-c",
  down: "m-down-c",
  warn: "m-warn-c",
};

export function StatPill({
  label,
  value,
  decimals = 0,
  suffix = "",
  tone,
  signed = false,
}: {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  tone?: "up" | "down" | "warn";
  signed?: boolean;
}) {
  return (
    <span style={{ display: "inline-block" }}>
      <span style={{ display: "block", fontSize: 10, color: "var(--m-muted)" }}>
        {label}
      </span>
      <span style={{ display: "block", fontSize: 16, fontWeight: 800 }}>
        <Odometer
          value={value}
          decimals={decimals}
          suffix={suffix}
          signed={signed}
          className={tone ? TONE_CLASS[tone] : ""}
        />
      </span>
    </span>
  );
}
