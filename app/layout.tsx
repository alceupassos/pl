import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Playfair_Display,
  Sora,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import "./landing.css";

import { LegalNotice } from "@/components/legal-notice";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Vitória Sempre — Cockpit de Campanha Político",
  description:
    "Assessoria estratégica, inteligência artificial e cockpit de campanha para transformar energia política em comando, prioridade e voto organizado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${playfair.variable} ${sora.variable} ${jetbrains.variable}`}
    >
      <body>
        {children}
        <LegalNotice variant="page" />
      </body>
    </html>
  );
}
