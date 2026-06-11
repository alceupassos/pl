import "./m.css";

import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { LiveDataProvider } from "@/components/mobile/live/provider";
import { RegisterSW } from "@/components/mobile/register-sw";
import { getAuthCookieName, verifySession } from "@/lib/auth";

// Display condensada para números-manchete (--font-display do m.css).
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Cockpit do Candidato",
  description: "O cockpit pessoal do candidato — índice, concorrentes e alertas ao vivo.",
  manifest: "/m/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cockpit SOST",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function MobileLayout({ children }: { children: React.ReactNode }) {
  // Gate server-side: /m inteiro exige sessão válida (mesma regra das rotas
  // API, inclusive IP-binding de credencial provisória — lib/auth.verifySession).
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySession(token, requestHeaders);
  if (!session) redirect("/");

  return (
    <div className={`m-app ${archivo.variable}`}>
      <LiveDataProvider>
        <RegisterSW />
        {children}
        {/* alvo dos bottom sheets — fora do track com transform */}
        <div id="m-portal" />
      </LiveDataProvider>
    </div>
  );
}
