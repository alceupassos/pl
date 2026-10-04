// UFs (módulo sem dependências de servidor: pode ser importado no cliente).

export const UF_NOME: Record<string, string> = {
  ac: "Acre", al: "Alagoas", am: "Amazonas", ap: "Amapá", ba: "Bahia", ce: "Ceará", df: "Distrito Federal",
  es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mg: "Minas Gerais", ms: "Mato Grosso do Sul",
  mt: "Mato Grosso", pa: "Pará", pb: "Paraíba", pe: "Pernambuco", pi: "Piauí", pr: "Paraná",
  rj: "Rio de Janeiro", rn: "Rio Grande do Norte", ro: "Rondônia", rr: "Roraima", rs: "Rio Grande do Sul",
  sc: "Santa Catarina", se: "Sergipe", sp: "São Paulo", to: "Tocantins",
};

// ordem por região (N, NE, CO, SE, S) — usada no painel nacional
export const UFS = [
  "ac", "am", "ap", "pa", "ro", "rr", "to",
  "al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se",
  "df", "go", "ms", "mt",
  "es", "mg", "rj", "sp",
  "pr", "rs", "sc",
];

export const REGIAO: Record<string, string> = Object.fromEntries(
  UFS.map((u, i) => [u, i < 7 ? "Norte" : i < 16 ? "Nordeste" : i < 20 ? "Centro-Oeste" : i < 24 ? "Sudeste" : "Sul"]),
);

export function isUF(v: string): boolean {
  return v in UF_NOME;
}
