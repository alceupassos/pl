"use client";

import Link from "next/link";
import { MapPin, Smartphone } from "lucide-react";

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
        <Link className="web-command-btn" href="/m">
          <Smartphone size={15} aria-hidden />
          Abrir mobile /m
        </Link>
        <Link className="web-command-btn web-command-btn-accent" href="/mapa">
          <MapPin size={15} aria-hidden />
          Mapa de acessos
        </Link>
        <span className="web-command-live">
          <span className="dot-live" /> AO VIVO
        </span>
      </div>
    </header>
  );
}
