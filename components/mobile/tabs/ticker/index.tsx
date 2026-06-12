"use client";

// Página 1 — painel principal. Slot 1 alterna SOST-IDX (candlestick) ↔ meta de
// eleitores a cada 10s; demais cards auto-flipam frente↔verso no mesmo intervalo.

import { AlertsFeed } from "@/components/mobile/tabs/ticker/alerts-feed";
import { CompetitorTape } from "@/components/mobile/tabs/ticker/competitor-tape";
import { EquipeResumo } from "@/components/mobile/tabs/ticker/equipe-resumo";
import { MetaEleitoresCard } from "@/components/mobile/tabs/ticker/meta-eleitores-card";
import { NationalActors } from "@/components/mobile/tabs/ticker/national-actors";
import { SignalCards } from "@/components/mobile/tabs/ticker/signal-cards";
import { SostIdxCard } from "@/components/mobile/tabs/ticker/sost-idx-card";
import { RotatingSlot } from "@/components/mobile/ui/rotating-slot";
import { TickerTape } from "@/components/mobile/ui/ticker-tape";

const AUTO_MS = 10_000;

export default function TickerTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TickerTape />
      <RotatingSlot
        intervalMs={AUTO_MS}
        cards={[<SostIdxCard key="sost-idx" />, <MetaEleitoresCard key="meta" />]}
      />
      <SignalCards />
      <EquipeResumo />
      <CompetitorTape />
      <NationalActors />
      <AlertsFeed />
    </div>
  );
}
