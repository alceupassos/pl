"use client";

export function WebCommandHeader() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "v4";

  return (
    <header className="web-command-header">
      <div className="web-command-header-main">
        <p className="web-command-kicker">Command Center</p>
        <h2 className="web-command-title">
          Cockpit operacional <span>{version}</span>
        </h2>
        <p className="web-command-sub">
          Visão desktop espelhando a lógica do mobile: índice, cadastro, concorrentes, redes e
          plenário — sem remover nenhuma seção existente.
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
