// Meta de cadastro de eleitores da campanha — fonte única do número-alvo e do
// calendário, usada pela página 1 (hero) e pelo snapshotEquipe (escala).

export const META_ELEITORES = 79_000;

// Janela de cadastro: do início da operação até o 1º turno (04/out/2026).
export const INICIO_CADASTRO_MS = new Date("2026-02-01T00:00:00-03:00").getTime();
export const ELEICAO_MS = new Date("2026-10-04T00:00:00-03:00").getTime();
const DIA_MS = 24 * 60 * 60 * 1000;

/** Onde o cadastro DEVERIA estar hoje, no plano linear até a eleição. */
export function previstoPara(agoraMs: number): number {
  const total = ELEICAO_MS - INICIO_CADASTRO_MS;
  const decorrido = agoraMs - INICIO_CADASTRO_MS;
  const frac = Math.max(0, Math.min(1, decorrido / total));
  return Math.round(META_ELEITORES * frac);
}

/** Dias corridos até a eleição (mínimo 1). */
export function diasAteEleicao(agoraMs: number): number {
  return Math.max(1, Math.round((ELEICAO_MS - agoraMs) / DIA_MS));
}
