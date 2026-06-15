export const TAB_IDS_W = [
  "mercados",
  "pesquisas",
  "candidatos",
  "apuracao",
  "historico",
  "radar",
  "config",
] as const;
export type TabIdW = (typeof TAB_IDS_W)[number];
