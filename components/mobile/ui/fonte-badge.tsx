"use client";

import { InfoTip } from "@/components/mobile/ui/info-tip";
import { FONTE_SIMULADO } from "@/lib/mobile/fonte-meta";

export function FonteBadge({
  real,
  como,
}: {
  real: boolean;
  /** Obrigatório quando `real` — como o dado foi extraído. */
  como?: string;
}) {
  const label = real ? "REAL" : "SIMULADO";
  const cls = `m-fonte-badge ${real ? "real" : "mock"}`;

  if (real && como) {
    return (
      <InfoTip texto={como}>
        <span className={cls} role="status">
          {label}
        </span>
      </InfoTip>
    );
  }

  return (
    <span className={cls} role="status" title={real ? como : FONTE_SIMULADO}>
      {label}
    </span>
  );
}
