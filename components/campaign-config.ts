export const navigationGroups = [
  {
    label: "Principal",
    items: [
      { id: "dashboard", icon: "layout-dashboard", label: "Dashboard" },
      { id: "noc", icon: "radar", label: "NOC ao Vivo" },
      { id: "plenario", icon: "landmark", label: "Plenário" },
      { id: "pesquisas", icon: "chart-column", label: "Pesquisas" },
      { id: "raiox", icon: "scan-search", label: "Raio-X Regional" },
      { id: "meta", icon: "target", label: "Meta de Votos" },
      { id: "territorios", icon: "map", label: "Territórios" },
      { id: "concorrentes", icon: "crosshair", label: "Concorrentes" },
    ],
  },
  {
    label: "Monitoramento",
    items: [
      { id: "social", icon: "share-2", label: "Ranking Redes" },
      { id: "posts", icon: "newspaper", label: "Posts por Rede" },
      { id: "redes", icon: "smartphone", label: "Redes Sociais" },
      { id: "midia", icon: "radio-tower", label: "Mídia & Imprensa" },
      { id: "influenciadores", icon: "users-round", label: "Influenciadores" },
      { id: "diario", icon: "clipboard-list", label: "Diário Campanha" },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { id: "ia", icon: "brain-circuit", label: "IA Preditiva" },
      { id: "demandas", icon: "messages-square", label: "Demandas Pop." },
    ],
  },
  {
    label: "Campo",
    items: [
      { id: "organizadores", icon: "git-fork", label: "Organizadores" },
      { id: "candidatos", icon: "user-round-search", label: "Candidatos" },
      { id: "eventos", icon: "calendar-days", label: "Agenda" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { id: "cabos", icon: "network", label: "Rede de Cabos" },
      { id: "crm", icon: "vote", label: "CRM Eleitoral" },
      { id: "material", icon: "package-2", label: "Material Camp." },
      { id: "downloads", icon: "folder-down", label: "Downloads" },
      { id: "comunicacao", icon: "message-circle", label: "Comunicação" },
    ],
  },
  {
    label: "Gestão & Jurídico",
    items: [
      { id: "financeiro", icon: "wallet", label: "Gestão de Verba" },
      { id: "compliance", icon: "shield-check", label: "Compliance TSE" },
      { id: "calculadora", icon: "calculator", label: "Calculadora" },
    ],
  },
] as const;

export const refreshableSections = new Set([
  "concorrentes",
  "redes",
  "diario",
  "ia",
  "demandas",
  "financeiro",
  "crm",
  "comunicacao",
  "meta",
]);
