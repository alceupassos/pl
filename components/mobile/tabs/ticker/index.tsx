"use client";

// Página 1 — painel principal de acompanhamento do deputado. Liderada pela META
// de eleitores (quanto está × onde deveria estar × quanto falta × dias para a
// eleição), os principais dados da equipe, os 4 sinais de imagem em cards claros
// e o panorama (concorrentes RJ + vento nacional). Sem jargão de bolsa.

import { AlertsFeed } from "@/components/mobile/tabs/ticker/alerts-feed";
import { CompetitorTape } from "@/components/mobile/tabs/ticker/competitor-tape";
import { EquipeResumo } from "@/components/mobile/tabs/ticker/equipe-resumo";
import { MetaEleitoresCard } from "@/components/mobile/tabs/ticker/meta-eleitores-card";
import { NationalActors } from "@/components/mobile/tabs/ticker/national-actors";
import { SignalCards } from "@/components/mobile/tabs/ticker/signal-cards";
import { TickerTape } from "@/components/mobile/ui/ticker-tape";

export default function TickerTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TickerTape />
      <MetaEleitoresCard />
      <SignalCards />
      <EquipeResumo />
      <CompetitorTape />
      <NationalActors />
      <AlertsFeed />
    </div>
  );
}
