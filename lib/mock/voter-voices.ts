// Vozes do eleitorado (mock) — mensagens estilo WhatsApp de eleitores reais
// (nome popular + bairro das regiões do RJ) e comentários de redes sociais.
// Consumido pelo canal SSE "voz" (lib/live-mock-v2.ts).

import type { Tom } from "@/lib/live-schemas";

export type VozTemplate = {
  texto: string;
  sentimento: Tom;
  fonte: "eleitor" | "x" | "instagram" | "facebook" | "youtube";
};

export const NOMES_ELEITORES = [
  "Maria das Graças", "Seu Jorge", "Dona Lúcia", "Carlos Eduardo", "Ana Paula",
  "Pastor Edson", "Irmã Regina", "Tia Penha", "Marcos Vinícius", "Josué",
  "Cláudia", "Roberto", "Vanessa", "Pr. Misael", "Dona Neuma",
  "Wesley", "Tatiane", "Sandro", "Michele", "Adriano",
  "Rosângela", "Gilmar", "Priscila", "Elias", "Fátima",
] as const;

export const HANDLES_REDES = [
  "@rj_acorda", "@patriota_rj", "@cidadao_fluminense", "@evangelico_br",
  "@politica_rj22", "@baixada_news", "@vozdacosta", "@serra_opina",
  "@cristao_atento", "@eleitor_consciente", "@direita_rj", "@meu_rio_meu_voto",
] as const;

export const VOZES_ELEITOR: VozTemplate[] = [
  { texto: "Deputado, o senhor falou pela gente na Câmara hoje. Deus abençoe! 🙏", sentimento: "pos", fonte: "eleitor" },
  { texto: "Aqui no bairro o pessoal da igreja tá todo fechado com o senhor", sentimento: "pos", fonte: "eleitor" },
  { texto: "Quando o senhor vem visitar a gente de novo? A comunidade quer receber", sentimento: "pos", fonte: "eleitor" },
  { texto: "Vi o vídeo da votação, mandou muito bem!! 👏👏", sentimento: "pos", fonte: "eleitor" },
  { texto: "Precisamos de ajuda com a segurança aqui, tá complicado andar à noite", sentimento: "neu", fonte: "eleitor" },
  { texto: "O posto de saúde fechou de novo, alguém tem que fazer alguma coisa", sentimento: "neg", fonte: "eleitor" },
  { texto: "Meu filho conseguiu o primeiro emprego, obrigada pela indicação do curso 🙏", sentimento: "pos", fonte: "eleitor" },
  { texto: "Tô divulgando seu trabalho no grupo da família, conta com a gente", sentimento: "pos", fonte: "eleitor" },
  { texto: "E aquela obra da estrada que prometeram? Nada até agora…", sentimento: "neg", fonte: "eleitor" },
  { texto: "O culto de domingo vai ter oração pela sua campanha 🙌", sentimento: "pos", fonte: "eleitor" },
  { texto: "Cadastrei mais 5 da minha rua no QR code hoje!", sentimento: "pos", fonte: "eleitor" },
  { texto: "Preço do gás tá um absurdo, alguém fala disso?", sentimento: "neg", fonte: "eleitor" },
  { texto: "Assisti sua entrevista, muito bom ver alguém defender a família", sentimento: "pos", fonte: "eleitor" },
  { texto: "A creche do bairro precisa de reforma urgente, deputado", sentimento: "neu", fonte: "eleitor" },
  { texto: "Tamo junto! Aqui em casa são 6 votos garantidos 💪", sentimento: "pos", fonte: "eleitor" },
];

export const VOZES_REDES: VozTemplate[] = [
  { texto: "Sóstenes é dos poucos que vota como fala. Respeito.", sentimento: "pos", fonte: "x" },
  { texto: "A oposição finalmente acordou nessa pauta da segurança", sentimento: "pos", fonte: "x" },
  { texto: "Discurso forte hoje no plenário, vale assistir na íntegra", sentimento: "pos", fonte: "youtube" },
  { texto: "Mais um político prometendo… quero ver entregar", sentimento: "neg", fonte: "facebook" },
  { texto: "Esse aí representa a bancada evangélica de verdade 🙏", sentimento: "pos", fonte: "instagram" },
  { texto: "Por que ninguém fala da saúde no interior do RJ?", sentimento: "neu", fonte: "facebook" },
  { texto: "Acompanho o mandato e tem resultado sim, dados públicos", sentimento: "pos", fonte: "x" },
  { texto: "Líder da oposição com mais visibilidade a cada semana", sentimento: "pos", fonte: "x" },
  { texto: "Não concordo com tudo, mas é coerente. Isso é raro.", sentimento: "neu", fonte: "youtube" },
  { texto: "O corte do vídeo de ontem tá fora de contexto, vejam o original", sentimento: "neu", fonte: "instagram" },
  { texto: "Esse voto da semana passada foi vergonhoso", sentimento: "neg", fonte: "x" },
  { texto: "RJ precisa de mais gente assim na Câmara federal", sentimento: "pos", fonte: "facebook" },
];
