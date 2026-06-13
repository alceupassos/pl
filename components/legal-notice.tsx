"use client";

// Rodapé discreto (texto curto sempre visível) + link "AVISO LEGAL" que abre o
// texto legal completo. Duas variantes:
//   mobile → modal via BottomSheet (#m-portal), tokens --m-* de m.css
//   page   → modal centralizado próprio (espelha login-access-modal); some em rotas /m
// Injetado em app/m/layout.tsx (mobile) e app/layout.tsx (page).

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { BottomSheet } from "@/components/mobile/ui/bottom-sheet";
import {
  LEGAL_NOTICE_FULL,
  LEGAL_NOTICE_LABEL,
  LEGAL_NOTICE_SHORT,
  LEGAL_NOTICE_TITLE,
} from "@/lib/legal-text";

export function LegalNotice({ variant }: { variant: "mobile" | "page" }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // O layout mobile já injeta a variante mobile; evita duplicar na variante page.
  if (variant === "page" && pathname?.startsWith("/m")) {
    return null;
  }

  if (variant === "mobile") {
    return (
      <>
        <footer className="m-legal">
          <span className="m-legal-text">{LEGAL_NOTICE_SHORT}</span>
          <button
            type="button"
            className="m-legal-link"
            onClick={() => setOpen(true)}
          >
            {LEGAL_NOTICE_LABEL}
          </button>
        </footer>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={LEGAL_NOTICE_TITLE}>
          <div className="m-legal-body">
            {LEGAL_NOTICE_FULL.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </BottomSheet>
      </>
    );
  }

  return (
    <>
      <footer className="legal-notice">
        <span className="legal-notice-text">{LEGAL_NOTICE_SHORT}</span>
        <button
          type="button"
          className="legal-notice-link"
          onClick={() => setOpen(true)}
        >
          {LEGAL_NOTICE_LABEL}
        </button>
      </footer>
      {open ? (
        <div
          className="legal-notice-modal"
          role="dialog"
          aria-modal="true"
          aria-label={LEGAL_NOTICE_TITLE}
        >
          <button
            type="button"
            className="legal-notice-backdrop"
            aria-label="Fechar aviso legal"
            onClick={() => setOpen(false)}
          />
          <div className="legal-notice-card">
            <button
              type="button"
              className="legal-notice-close"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
            <h2 className="legal-notice-card-title">{LEGAL_NOTICE_TITLE}</h2>
            <div className="legal-notice-body">
              {LEGAL_NOTICE_FULL.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
