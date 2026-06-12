"use client";

// Página 1 — painel principal. Ordem: SOST-IDX (índice), candle dos
// concorrentes, meta de eleitores e demais cards. Todos os flips são manuais
// (toque vira, ‹ voltar desvira).

import { AlertsFeed } from "@/components/mobile/tabs/ticker/alerts-feed";
import { CompetitorTape } from "@/components/mobile/tabs/ticker/competitor-tape";
import { EquipeResumo } from "@/components/mobile/tabs/ticker/equipe-resumo";
import { MetaEleitoresCard } from "@/components/mobile/tabs/ticker/meta-eleitores-card";
import { NationalActors } from "@/components/mobile/tabs/ticker/national-actors";
import { SignalCards } from "@/components/mobile/tabs/ticker/signal-cards";
import { SostIdxCard } from "@/components/mobile/tabs/ticker/sost-idx-card";
import { TickerTape } from "@/components/mobile/ui/ticker-tape";

export default function TickerTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TickerTape />
      <SostIdxCard />
      <MetaEleitoresCard />
      <CompetitorTape />
      <SignalCards />
      <EquipeResumo />
      <NationalActors />
      <AlertsFeed />
    </div>
  );
}
