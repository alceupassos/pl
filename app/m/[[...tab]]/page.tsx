import { notFound } from "next/navigation";

import { MobileShell } from "@/components/mobile/shell";
import { TAB_IDS, type TabId } from "@/components/mobile/tabs";

// Catch-all opcional: /m, /m/ticker, /m/plenario… — deep links reais (push
// abre direto na aba) sem remontar o shell na troca por swipe.
export default async function MobilePage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const { tab } = await params;
  const id = tab?.[0] ?? "ticker";
  if (tab && (tab.length > 1 || !(TAB_IDS as readonly string[]).includes(id))) {
    notFound();
  }
  return <MobileShell initialTab={id as TabId} />;
}
