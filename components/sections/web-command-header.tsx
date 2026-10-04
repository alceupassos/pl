"use client";

export function WebCommandHeader() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "v4";

  return (
    <header className="web-command-header">
      <div className="web-command-header-main">
        <h2 className="web-command-title">
          Visão de comando <span>{version}</span>
        </h2>
        <p className="web-command-sub">
          Acompanhe o cenário, organize prioridades e conduza a operação da campanha.
        </p>
      </div>
      <div className="web-command-actions">
        <span className="web-command-live">
          <span className="dot-live" /> AO VIVO
        </span>
      </div>
    </header>
  );
}
