import { getMembro } from "@/lib/organizadores";

import { RegistroForm } from "./registro-form";

export const dynamic = "force-dynamic";

export default async function CadastroEleitorPage({
  params,
}: {
  params: Promise<{ cabo: string }>;
}) {
  const { cabo } = await params;
  let caboNome: string | null = null;
  try {
    const membro = await getMembro(cabo);
    caboNome = membro?.nome ?? null;
  } catch {
    caboNome = null;
  }
  return <RegistroForm caboId={cabo} caboNome={caboNome} />;
}
