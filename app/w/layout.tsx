import "./w.css";

import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { LegalNotice } from "@/components/legal-notice";
import { LiveDataProvider } from "@/components/mobile/live/provider";
import { RegisterSW } from "@/components/mobile/register-sw";
import { appendAccessLog } from "@/lib/access-log";
import { getAuthCookieName, verifySession } from "@/lib/auth";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Mercados Eleitorais BR 2026",
  description: "Cockpit de mercados eleitorais Brasil 2026 — pesquisas, probabilidades e apuração ao vivo.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mercados BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function WLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const session = verifySession(token, requestHeaders);
  if (!session) redirect("/");

  const mobilePath = requestHeaders.get("x-mobile-path");
  const isRsc = requestHeaders.get("RSC") === "1";
  const isPrefetch =
    requestHeaders.get("purpose") === "prefetch" ||
    requestHeaders.get("sec-purpose") === "prefetch";

  if (mobilePath && !isRsc && !isPrefetch) {
    await appendAccessLog(requestHeaders, {
      event: "mobile_page_view",
      path: mobilePath,
    });
  }

  return (
    <div className={`m-app ${archivo.variable}`}>
      <LiveDataProvider>
        <RegisterSW />
        {children}
        <LegalNotice variant="mobile" />
        <div id="m-portal" />
      </LiveDataProvider>
    </div>
  );
}
