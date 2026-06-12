// Textos de extração para o badge DADOS REAIS (tooltip).

export const FONTE_SIMULADO =
  "Série sintética do cockpit para operação e demonstração — não reflete fonte externa ao vivo.";

export const FONTE_COMO = {
  idxComposto:
    "Índice composto em tempo real: média ponderada de imprensa, sentimento, seguidores e menções (componentes reais quando disponíveis). Histórico diário persistido em cache local.",
  imprensa: "Google News RSS — volume de matérias sobre o candidato nos últimos dias, normalizado ~100.",
  sentimento: "Sidecar pysentimiento (BERT em PT) sobre manchetes reais do Google News — positivo vs negativo.",
  seguidores: "Sidecar yt-dlp — inscritos do canal oficial do YouTube, sem API key.",
  mencoes: "Sidecar pytrends — interesse de busca no Google Trends (Brasil, 7 dias), normalizado ~100.",
  youtubeVideos: "Sidecar yt-dlp — views, likes e comentários dos últimos vídeos do canal oficial.",
  tiktok: "Sidecar yt-dlp — seguidores do perfil @handle no TikTok, sem API key.",
  tiktokVideos: "Sidecar yt-dlp — views, likes e comentários dos últimos vídeos do perfil principal.",
  plenario: "API Câmara Dados Abertos — votações do Plenário (órgão 180); placar na descrição.",
  gastosCamara:
    "API Câmara Dados Abertos — despesas CEAP do deputado 178947 (cota parlamentar), agregadas por categoria e mês.",
  pesquisasPres:
    "Sidecar — tabela da Wikipédia (pesquisas presidenciais 2026), parseada com pandas/lxml.",
  votos2022: "Constante TSE — resultados oficiais 2022, deputado federal RJ (152.763 votos).",
  newsRadar: "Google News — manchetes indexadas em tempo real para o radar de imprensa.",
} as const;
