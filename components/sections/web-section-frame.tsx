"use client";

import type { ReactNode } from "react";

export function WebSectionFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="web-section-frame">
      <header className="web-section-frame-head">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      <div className="web-section-frame-body">{children}</div>
    </div>
  );
}
