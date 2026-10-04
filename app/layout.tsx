import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Playfair_Display,
  Sora,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import "./landing.css";
import "./design-refresh.css";

import { LegalNotice } from "@/components/legal-notice";
import { PageTracker } from "@/components/page-tracker";

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
      className={`dark ${dmSans.variable} ${playfair.variable} ${sora.variable} ${jetbrains.variable}`}
      style={{ colorScheme: "dark", backgroundColor: "#060a12" }}
      // o telão aplica data-tema no <html> antes da hidratação
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: `html,body{background-color:#070a12!important;background-image:linear-gradient(180deg,rgba(255,255,255,0.08) 0%,rgba(255,255,255,0.02) 40%,rgba(2,6,23,0.6) 100%),repeating-linear-gradient(90deg,rgba(255,255,255,0.035) 0px,rgba(255,255,255,0.035) 2px,transparent 2px,transparent 32px),radial-gradient(ellipse 100% 70% at 50% -10%,rgba(56,189,248,0.12),transparent 70%)!important;background-attachment:fixed!important;color:#f1f5fa!important;color-scheme:dark!important;}` }} />
      </head>
      <body style={{ backgroundColor: "#070a12", color: "#f1f5fa" }}>
        {children}
        <PageTracker />
        <LegalNotice variant="page" />
      </body>
    </html>
  );
}
