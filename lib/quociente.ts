// Matemática do quociente eleitoral — função pura, extraída para ser usada
// pela calculadora do cockpit desktop (syncCalculatorOutputs) e pela aba
// "2026" do /m (projeção de bancada). Fórmulas idênticas às que estavam
// inline em components/campaign-cockpit.tsx.

export type QuocienteInput = {
  /** Eleitorado total. */
  eleitores: number;
  /** Comparecimento esperado, 0..1. */
  comparecimento: number;
  /** Brancos e nulos, 0..1. */
  invalidos: number;
  /** Vagas em disputa. */
  vagas: number;
  /** Margem de segurança sobre o quociente, 0..1. */
  margem: number;
};

export type QuocienteOutput = {
  /** Quociente eleitoral (votos válidos / vagas). */
  coeficiente: number;
  /** Meta de votos com a margem de segurança aplicada. */
  metaVotos: number;
};

export function calcularQuociente(input: QuocienteInput): QuocienteOutput {
  const totalVotos = input.eleitores * input.comparecimento;
  const validos = totalVotos * (1 - input.invalidos);
  const coeficiente = Math.round(validos / input.vagas);
  const metaVotos = Math.round(coeficiente * (1 + input.margem));
  return { coeficiente, metaVotos };
}

export type BancadaInput = {
  /** Votos de legenda projetados do partido. */
  votosLegenda: number;
  /** Quociente eleitoral. */
  quociente: number;
  /** Variação dos cenários pessimista/otimista sobre os votos, 0..1 (ex.: 0.12). */
  variacaoCenarios?: number;
};

export type BancadaOutput = {
  /** Cadeiras no cenário base. */
  base: number;
  /** [pessimista, otimista]. */
  faixa: [number, number];
};

export function projetarBancada(input: BancadaInput): BancadaOutput {
  const variacao = input.variacaoCenarios ?? 0.12;
  const cadeiras = (votos: number) =>
    Math.max(0, Math.floor(votos / input.quociente));
  const base = cadeiras(input.votosLegenda);
  return {
    base,
    faixa: [
      cadeiras(input.votosLegenda * (1 - variacao)),
      cadeiras(input.votosLegenda * (1 + variacao)),
    ],
  };
}
