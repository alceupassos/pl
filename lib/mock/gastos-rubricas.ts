// Rubricas de gastos de campanha (mock) — base do canal SSE "gastos".
// Valores em R$ mil. Uma rubrica em estouro + uma em atenção alimentam
// os alertas do painel.

export type Rubrica = {
  nome: string;
  orcado: number; // R$ mil
  gasto: number; // R$ mil
};

export const ORCAMENTO_TOTAL = 4200; // R$ mil (teto da campanha)

export const RUBRICAS: Rubrica[] = [
  { nome: "Marketing digital", orcado: 1100, gasto: 1010 },
  { nome: "Material gráfico", orcado: 480, gasto: 530 }, // estouro
  { nome: "Eventos e comícios", orcado: 640, gasto: 410 },
  { nome: "Pessoal e diárias", orcado: 720, gasto: 455 },
  { nome: "Transporte e combustível", orcado: 340, gasto: 298 }, // atenção
  { nome: "Pesquisas", orcado: 280, gasto: 140 },
  { nome: "Jurídico e contábil", orcado: 240, gasto: 122 },
  { nome: "Estrutura e comitês", orcado: 400, gasto: 204 },
];
