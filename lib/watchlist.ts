// Watchlist do Cockpit do Candidato (/m): quem monitoramos e com quais pesos.
// Fonte de verdade editável em data/watchlist.json (admin em /m/config).
// Server-only (usa fs) — o client recebe a watchlist via canal SSE "watchlist"
// ou via GET /api/watchlist.

import { promises as fs } from "fs";
import path from "path";

import { z } from "zod";

const HandlesSchema = z.record(z.string(), z.string());

export const PrincipalSchema = z.object({
  simbolo: z.string(),
  nome: z.string(),
  partido: z.string(),
  uf: z.string(),
  votos2022: z.number().nullable().optional(),
  cor: z.string(),
  foto: z.string().optional(),
  handles: HandlesSchema.optional(),
});

export const ConcorrenteSchema = z.object({
  simbolo: z.string(),
  nome: z.string(),
  partido: z.string(),
  interno: z.boolean(),
  votos2022: z.number().nullable(),
  cor: z.string(),
  foto: z.string().optional(),
  handles: HandlesSchema.optional(),
});

export const AtorNacionalSchema = z.object({
  id: z.string(),
  nome: z.string(),
  partido: z.string().optional(),
  foto: z.string().optional(),
  handles: HandlesSchema.optional(),
});

export const EntidadeEvangelicaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  tipo: z.enum(["igreja", "canal", "radio", "rede", "influenciador"]),
  /** Alcance estimado em milhares de pessoas. */
  alcance: z.number(),
});

export const ColunistaSchema = z.object({
  nome: z.string(),
  veiculo: z.string(),
});

export const WatchlistSchema = z.object({
  version: z.number(),
  principal: PrincipalSchema,
  pesosIndice: z.object({
    mencoes: z.number(),
    sentimento: z.number(),
    seguidores: z.number(),
    imprensa: z.number(),
  }),
  concorrentes_rj: z.array(ConcorrenteSchema),
  atores_nacionais: z.array(AtorNacionalSchema),
  ecossistema_evangelico: z.array(EntidadeEvangelicaSchema),
  colunistas: z.array(ColunistaSchema),
  veiculos: z.array(z.string()),
  termos: z.array(z.string()),
});

export type Watchlist = z.infer<typeof WatchlistSchema>;
export type Concorrente = z.infer<typeof ConcorrenteSchema>;
export type AtorNacional = z.infer<typeof AtorNacionalSchema>;

// Defaults embutidos: se data/watchlist.json sumir ou falhar validação, o /m
// continua de pé com os 5 concorrentes do spec.
export const DEFAULT_WATCHLIST: Watchlist = {
  version: 1,
  principal: {
    simbolo: "SOST",
    nome: "Sóstenes Cavalcante",
    partido: "PL",
    uf: "RJ",
    votos2022: 152763,
    cor: "#16C784",
    handles: {
      instagram: "sostenescavalcante",
      facebook: "sostenescavalcante",
      x: "DepSostenes",
      youtube: "https://www.youtube.com/channel/UCI2j76o7JyLVSmooEcSvLxA",
    },
  },
  pesosIndice: { mencoes: 0.35, sentimento: 0.3, seguidores: 0.2, imprensa: 0.15 },
  concorrentes_rj: [
    { simbolo: "JRDY", nome: "Carlos Jordy", partido: "PL", interno: true, votos2022: null, cor: "#3B82F6",
      handles: { instagram: "carlosjordy", tiktok: "carlosjordydep", facebook: "carlosjordyoficial", x: "carlosjordy", youtube: "https://www.youtube.com/carlosjordy" } },
    { simbolo: "DWAG", nome: "Daniela do Waguinho", partido: "União", interno: false, votos2022: 213706, cor: "#A855F7",
      handles: { instagram: "danielacarneirooficial", facebook: "danielacarneirooficial", x: "DanielaCarneiro" } },
    { simbolo: "PZLO", nome: "General Pazuello", partido: "PL", interno: true, votos2022: 205324, cor: "#22D3EE",
      handles: { instagram: "generalpazuello.oficial", tiktok: "generalpazuello", facebook: "generalpazuello.oficial", x: "PazuelloGeneral" } },
    { simbolo: "TPET", nome: "Talíria Petrone", partido: "PSOL", interno: false, votos2022: 198548, cor: "#FB923C",
      handles: { instagram: "taliriapetrone", tiktok: "taliriapetrone", facebook: "taliriapetronepsol", x: "taliriapetrone" } },
    { simbolo: "DLUZ", nome: "Doutor Luizinho", partido: "PP", interno: false, votos2022: 190071, cor: "#FACC15",
      handles: { instagram: "doutorluizinho", facebook: "DoutorLuizinho", x: "Doutorluizinhot", youtube: "https://www.youtube.com/@doutorluizinho" } },
  ],
  atores_nacionais: [
    { id: "lula", nome: "Lula", partido: "PT", foto: "/ai/fig-lula.png",
      handles: { instagram: "lulaoficial", tiktok: "lulaoficial", facebook: "Lula", x: "LulaOficial", linkedin: "lulaoficial", youtube: "https://www.youtube.com/LulaOficial" } },
    { id: "flavio-bolsonaro", nome: "Flávio Bolsonaro", partido: "PL", foto: "/ai/fig-flavio-bolsonaro.png",
      handles: { instagram: "flaviobolsonaro", tiktok: "flaviobolsonaro", facebook: "flaviobolsonaro", x: "FlavioBolsonaro", youtube: "https://www.youtube.com/flaviobolsonaro" } },
    { id: "renan-santos", nome: "Renan Santos", partido: "Missão", foto: "/ai/fig-renan-santos.png",
      handles: { instagram: "renansantosmbl", tiktok: "renansantosmbl", facebook: "renansantosmbl", x: "RenanSantosMBL", youtube: "https://www.youtube.com/@renansantosmbl" } },
    { id: "ronaldo-caiado", nome: "Ronaldo Caiado", partido: "União",
      handles: { instagram: "ronaldocaiado", tiktok: "ronaldocaiado44", facebook: "governador.ronaldo.caiado.2024", x: "ronaldocaiado", linkedin: "ronaldocaiado", youtube: "https://www.youtube.com/@ronaldocaiado44" } },
    { id: "zema", nome: "Romeu Zema", partido: "Novo",
      handles: { instagram: "romeuzemaoficial", tiktok: "romeuzemaoficial", facebook: "RomeuZemaOficial", x: "RomeuZema", linkedin: "romeuzema", youtube: "https://www.youtube.com/c/RomeuZema30" } },
  ],
  ecossistema_evangelico: [],
  colunistas: [],
  veiculos: [],
  termos: ["Sóstenes Cavalcante"],
};

const FILE = path.join(process.cwd(), "data", "watchlist.json");
const CACHE_TTL_MS = 5000;

let cache: { at: number; value: Watchlist } | null = null;

/** Lê e valida a watchlist (cache de 5s). Nunca lança — cai nos defaults. */
export async function readWatchlist(): Promise<Watchlist> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = WatchlistSchema.safeParse(JSON.parse(raw));
    const value = parsed.success ? parsed.data : DEFAULT_WATCHLIST;
    if (!parsed.success) {
      console.warn("[watchlist] arquivo inválido — usando defaults:", parsed.error.message);
    }
    cache = { at: Date.now(), value };
    return value;
  } catch {
    cache = { at: Date.now(), value: DEFAULT_WATCHLIST };
    return DEFAULT_WATCHLIST;
  }
}

/** Valida e grava a watchlist; invalida o cache. Lança ZodError se inválida. */
export async function writeWatchlist(input: unknown): Promise<Watchlist> {
  const value = WatchlistSchema.parse(input);
  await fs.writeFile(FILE, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  cache = { at: Date.now(), value };
  return value;
}
