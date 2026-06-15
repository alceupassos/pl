// Log de onboarding do /m — primeira visita do usuário.
// Mesmo padrão dos outros JSONL: append linha a linha em data/onboarding.jsonl.

import { promises as fs } from "fs";
import path from "path";

export type OnboardingEntry = {
  at: string;
  uid: string;
  nome: string;
  cidade: string;
  uf: string;
  situacao: "candidato" | "politica" | "outro";
  whatsapp: string;
  email: string;
  pergunta: string;
  ip: string;
};

const FILE = path.join(process.cwd(), "data", "onboarding.jsonl");

export async function appendOnboardingLog(
  entry: Omit<OnboardingEntry, "at" | "ip">,
  ip: string,
): Promise<OnboardingEntry> {
  const full: OnboardingEntry = { at: new Date().toISOString(), ip, ...entry };
  const line = `${JSON.stringify(full)}\n`;
  await fs.appendFile(FILE, line, "utf8").catch(() => undefined);
  return full;
}

export async function readOnboardingLog(): Promise<OnboardingEntry[]> {
  const raw = await fs.readFile(FILE, "utf8").catch(() => "");
  if (!raw) return [];

  const entries: OnboardingEntry[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as OnboardingEntry);
    } catch {
      // linha corrompida — ignora
    }
  }
  return entries;
}
