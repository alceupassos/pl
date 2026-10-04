// Últimas pesquisas divulgadas antes do 1º turno (votos válidos). Usadas quando
// ninguém lançou outra em /telao/boca-de-urna (aba "Última pesquisa").
// Fontes: AtlasIntel 27/09–02/10 (presidente, n=4.945; senado SP),
// Quaest 02–03/10 (governador SP, n=3.702).

import type { BocaDeUrna } from "./boca-de-urna";

export const PESQUISAS_PADRAO: BocaDeUrna = {
  presidente: {
    instituto: "AtlasIntel",
    divulgadoEm: "03/10",
    margem: 1,
    entrevistas: 4945,
    fonte: "AtlasIntel · votos válidos · 27/09–02/10",
    cand: [
      { num: 13, nome: "LULA", partido: "PT", pct: 47 },
      { num: 22, nome: "FLAVIO BOLSONARO", partido: "PL", pct: 44.1 },
      { num: 14, nome: "RENAN SANTOS", partido: "MISSÃO", pct: 4.6 },
      { num: 70, nome: "ESCRITOR AUGUSTO CURY", partido: "AVANTE", pct: 2.1 },
      { num: 55, nome: "RONALDO CAIADO", partido: "PSD", pct: 1.4 },
    ],
  },
  "governador-sp": {
    instituto: "Quaest",
    divulgadoEm: "03/10",
    margem: 2,
    entrevistas: 3702,
    fonte: "Quaest · votos válidos · 02–03/10",
    cand: [
      { num: 10, nome: "TARCÍSIO", partido: "REPUBLICANOS", pct: 60 },
      { num: 13, nome: "FERNANDO HADDAD", partido: "PT", pct: 36 },
    ],
  },
  "senador-sp": {
    instituto: "AtlasIntel",
    divulgadoEm: "03/10",
    margem: 2,
    entrevistas: 0,
    fonte: "AtlasIntel · votos válidos (2 votos por eleitor)",
    cand: [
      { num: 111, nome: "GUILHERME DERRITE", partido: "PP", pct: 25.9 },
      { num: 222, nome: "ANDRÉ DO PRADO", partido: "PL", pct: 24.2 },
      { num: 400, nome: "SIMONE TEBET", partido: "PSB", pct: 22.2 },
      { num: 180, nome: "MARINA SILVA", partido: "REDE", pct: 21.5 },
    ],
  },
};

// Desistências conhecidas (o cadastro do TSE ainda não refletia)
export const DESISTENTES: Record<string, number[]> = {
  "senador-sp": [300], // Ricardo Salles desistiu em 28/09
};
