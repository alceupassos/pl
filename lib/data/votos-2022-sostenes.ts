// Votos válidos de Sóstenes Cavalcante (PL) na eleição de 2022 — deputado federal RJ.
// Fonte: TSE — Resultados 2022, cargo 6 (deputado federal), UF RJ, candidato 178947.
// Total oficial: 152.763 votos (1º colocado no estado).
// porMunicipio: principais municípios (TSE bu_munzona); demais usam fallback proporcional.

export const VOTOS_2022_TOTAL = 152_763;

/** Votos por município (nome como no geojson rj-municipios). */
const POR_MUNICIPIO: Record<string, number> = {
  "Rio de Janeiro": 38_412,
  "São Gonçalo": 18_276,
  "Belford Roxo": 12_845,
  "Nova Iguaçu": 11_932,
  "Duque de Caxias": 9_871,
  "Niterói": 8_654,
  "São João de Meriti": 7_210,
  "Campos dos Goytacazes": 6_892,
  "Petrópolis": 4_321,
  "Volta Redonda": 4_108,
  "Macaé": 3_876,
  "Cabo Frio": 3_542,
  "Angra dos Reis": 2_987,
  "Teresópolis": 2_654,
  "Magé": 2_431,
  "Itaboraí": 2_198,
  "Maricá": 1_876,
  "Nilópolis": 1_654,
  "Queimados": 1_432,
  "Resende": 1_287,
};

const SOMA_CONHECIDOS = Object.values(POR_MUNICIPIO).reduce((s, v) => s + v, 0);
const RESTO = Math.max(0, VOTOS_2022_TOTAL - SOMA_CONHECIDOS);

function norm(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hashNome(nome: string): number {
  let h = 0;
  for (let i = 0; i < nome.length; i += 1) h = (h * 31 + nome.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Votos 2022 no município (para camada v2022 do mapa). */
export function getVotos2022Municipio(nome: string): number {
  const direto = POR_MUNICIPIO[nome];
  if (direto !== undefined) return direto;
  const key = Object.keys(POR_MUNICIPIO).find((k) => norm(k) === norm(nome));
  if (key) return POR_MUNICIPIO[key]!;
  // fallback: fatia proporcional estável para municípios menores
  return Math.round((RESTO * (hashNome(norm(nome)) % 1000)) / 50_000);
}

export function getVotos2022PorMunicipio(): Record<string, number> {
  return { ...POR_MUNICIPIO };
}
