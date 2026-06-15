import { notFound } from "next/navigation";

import { WShell } from "@/components/w/shell";
import { TAB_IDS_W, type TabIdW } from "@/components/w/tabs";

export default async function WPage({
  params,
}: {
  params: Promise<{ tab?: string[] }>;
}) {
  const { tab } = await params;
  const id = tab?.[0] ?? "mercados";
  if (tab && (tab.length > 1 || !(TAB_IDS_W as readonly string[]).includes(id))) {
    notFound();
  }
  return <WShell initialTab={id as TabIdW} />;
}
