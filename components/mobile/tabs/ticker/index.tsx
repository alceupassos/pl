"use client";

// Aba TICKER — home / war room pessoal do candidato.
// Tudo aqui é vivo: manchetes, índice, sentimento, fita de concorrentes,
// tabuleiro nacional e alertas.

import { AlertsFeed } from "@/components/mobile/tabs/ticker/alerts-feed";
import { CompetitorTape } from "@/components/mobile/tabs/ticker/competitor-tape";
import { NationalActors } from "@/components/mobile/tabs/ticker/national-actors";
import { SentimentEcg } from "@/components/mobile/tabs/ticker/sentiment-ecg";
import { SostIdxCard } from "@/components/mobile/tabs/ticker/sost-idx-card";
import { TickerTape } from "@/components/mobile/ui/ticker-tape";

export default function TickerTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <TickerTape />
      <SostIdxCard />
      <SentimentEcg />
      <CompetitorTape />
      <NationalActors />
      <AlertsFeed />
    </div>
  );
}
