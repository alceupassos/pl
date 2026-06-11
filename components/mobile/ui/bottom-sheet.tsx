"use client";

// Bottom sheet portalado para fora do track de swipe (que tem transform —
// position:fixed dentro dele quebraria). O alvo #m-portal vive no layout,
// dentro de .m-app, para os tokens continuarem valendo.

import { createPortal } from "react-dom";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  const target = typeof document === "undefined" ? null : document.getElementById("m-portal");
  if (!target) return null;

  return createPortal(
    <>
      <div className="m-sheet-overlay" onClick={onClose} aria-hidden />
      <div className="m-sheet" role="dialog" aria-modal="true" aria-label={title} data-no-swipe>
        <div className="m-sheet-grab" aria-hidden />
        {title ? (
          <div className="m-card-head">
            <span className="m-card-title">{title}</span>
            <button type="button" className="m-btn" onClick={onClose} style={{ padding: "5px 10px" }}>
              fechar
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </>,
    target,
  );
}
