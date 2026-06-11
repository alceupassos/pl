// Mídia & Imprensa — matérias REAIS sobre o candidato (links verificáveis).

import type { UltimoPost } from "./types";

export type Sentimento = "Favorável" | "Neutro" | "Crítico";

export type Materia = {
  data: string;
  titulo: string;
  veiculo: string;
  sentimento: Sentimento;
  link: string;
  trecho: string;
  /** Sobre quem é a matéria: o candidato (default) ou o governo (munição). */
  alvo?: "candidato" | "governo";
  /** Alcance estimado do veículo, em milhares (usado no ranking de munição). */
  alcance?: number;
};

export const MATERIAS: Materia[] = [
  {
    data: "27/03/2025",
    titulo: "Empresário de Angra pretende pleitear vaga para federal",
    veiculo: "Correio da Manhã",
    sentimento: "Favorável",
    link: "https://www.correiodamanha.com.br/correio-sul-fluminense/regiao-do-vale/2025/03/190836-angra-empresario-pretende-pleitear-vaga-para-federal.html",
    trecho: "Pré-candidatura a deputado federal ganha força na Costa Verde.",
  },
  {
    data: "15/04/2025",
    titulo: "Empresário de Angra agradece equipe que cuida de Bolsonaro",
    veiculo: "Correio da Manhã",
    sentimento: "Favorável",
    link: "https://www.correiodamanha.com.br/correio-sul-fluminense/regiao-do-vale/2025/04/194176-empresario-de-angra-agradece-equipe-que-cuida-de-bolsonaro.html",
    trecho: "Demonstração pública de apoio ao ex-presidente.",
  },
  {
    data: "07/08/2025",
    titulo: "Aliado de Bolsonaro tem autorização do STF para visitá-lo",
    veiculo: "O Dia",
    sentimento: "Favorável",
    link: "https://odia.ig.com.br/angra-dos-reis/2025/08/7107057-empresario-angrense-aliado-de-bolsonaro-tem-autorizacao-do-stf-para-visitar-o-ex-presidente.html",
    trecho: "STF autoriza visita ao ex-presidente.",
  },
  {
    data: "2025",
    titulo: "Renato Araújo, o queridinho dos bolsonaristas",
    veiculo: "Tempo Real RJ",
    sentimento: "Favorável",
    link: "https://temporealrj.com/renato-araujo-o-queridinho-dos-bolsonaristas/",
    trecho: "Perfil de liderança no campo bolsonarista da região.",
  },
  {
    data: "22/09/2024",
    titulo: "Candidato a prefeito do PL é alvo de tiros durante passeata",
    veiculo: "Pleno.News",
    sentimento: "Neutro",
    link: "https://pleno.news/brasil/cidades/candidato-a-prefeito-do-pl-e-alvo-de-tiros-durante-passeata-no-rj.html",
    trecho: "Episódio de violência durante ato de campanha.",
  },
  {
    data: "22/09/2024",
    titulo: "Tiros em passeata de candidato em Angra dos Reis",
    veiculo: "Gazeta do Povo",
    sentimento: "Neutro",
    link: "https://www.gazetadopovo.com.br/eleicoes/2024/tiros-passeata-candidato-angra-dos-reis-rio-de-janeiro/",
    trecho: "Cobertura nacional sobre a violência na campanha.",
  },
  {
    data: "01/02/2024",
    titulo: "Prefeitura aciona MP para que empresário devolva R$ 400 mil",
    veiculo: "A Voz da Cidade",
    sentimento: "Crítico",
    link: "https://avozdacidade.com/wp/prefeitura-de-angra-aciona-mp-para-que-empresario-devolva-mais-de-r-400-mil-aos-cofres-publicos/",
    trecho: "Cobrança judicial movida pela prefeitura.",
  },
  {
    data: "07/08/2024",
    titulo: "MP investiga projeto de condomínio de luxo em Angra",
    veiculo: "A Voz da Cidade",
    sentimento: "Crítico",
    link: "https://avozdacidade.com/wp/ministerio-publico-investiga-projeto-de-condominio-de-luxo-feito-por-renato-araujo-em-angra/",
    trecho: "Investigação do Ministério Público sobre empreendimento.",
  },
  {
    data: "05/10/2024",
    titulo: "Candidato deve R$ 120 mil em impostos",
    veiculo: "Diário Carioca",
    sentimento: "Crítico",
    link: "https://www.diariocarioca.com/rio-de-janeiro/candidato-de-bolsonaro-em-angra-dos-reis-deve-r-120-mil-em-impostos/",
    trecho: "Pendências de ISS apontadas pela reportagem.",
  },
  {
    data: "29/08/2025",
    titulo: "Aliados de Bolsonaro organizam manifestação no 7 de Setembro",
    veiculo: "BNews",
    sentimento: "Neutro",
    link: "https://www.bnews.com.br/noticias/politica/aliados-de-bolsonaro-organizam-manifestacao-no-7-de-setembro-em-frente-casa-de-praia-do-ex-presidente.html",
    trecho: "Mobilização para o 7 de Setembro.",
  },
];

// "Munição": matérias negativas sobre o GOVERNO nas últimas 24h (mock,
// ranqueadas por alcance) — espelham a coluna Munição da aba Radar do /m.
export const MUNICAO: Materia[] = [
  {
    data: "hoje",
    titulo: "Governo corta verba de programa social e gera reação no Congresso",
    veiculo: "O Globo",
    sentimento: "Crítico",
    link: "",
    trecho: "Corte atinge programas com forte apelo popular no Sudeste.",
    alvo: "governo",
    alcance: 2100,
  },
  {
    data: "hoje",
    titulo: "Inflação de alimentos volta a subir e pressiona o Planalto",
    veiculo: "Folha de S.Paulo",
    sentimento: "Crítico",
    link: "",
    trecho: "Cesta básica acumula alta e corrói aprovação no eleitorado de baixa renda.",
    alvo: "governo",
    alcance: 1900,
  },
  {
    data: "hoje",
    titulo: "Obra federal prometida no RJ completa dois anos parada",
    veiculo: "Extra",
    sentimento: "Crítico",
    link: "",
    trecho: "Pauta direta para o palanque fluminense da oposição.",
    alvo: "governo",
    alcance: 1300,
  },
  {
    data: "hoje",
    titulo: "Ministério é alvo de operação por suspeita de desvio",
    veiculo: "Metrópoles",
    sentimento: "Crítico",
    link: "",
    trecho: "Operação atinge indicação política da base do governo.",
    alvo: "governo",
    alcance: 1100,
  },
  {
    data: "hoje",
    titulo: "Base do governo racha em votação-chave na Câmara",
    veiculo: "Estadão",
    sentimento: "Crítico",
    link: "",
    trecho: "Articulação falha e expõe fragilidade da coalizão.",
    alvo: "governo",
    alcance: 950,
  },
];

export const VEICULOS = Array.from(new Set(MATERIAS.map((m) => m.veiculo)));

export function sentimentoColor(s: Sentimento): string {
  return s === "Favorável"
    ? "#22c55e"
    : s === "Crítico"
      ? "#ef4444"
      : "#8a8aaa";
}

export function getMateriaPost(m: Materia): UltimoPost {
  return {
    rede: m.veiculo,
    texto: m.trecho,
    data: m.data,
    link: m.link,
  };
}
