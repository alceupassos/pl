import { headers } from "next/headers";

import { AccessMap } from "@/components/access-map";
import {
  appendAccessLog,
  isAccessOnline,
  summarizeAccessLogs,
} from "@/lib/access-log";
import { readOnboardingLog } from "@/lib/onboarding-log";

type CityPosition = {
  lat: number;
  lon: number;
  x?: number;
  y?: number;
};

const CITY_POSITIONS: Record<string, CityPosition> = {
  aracaju: { lat: -10.9472, lon: -37.0731 },
  angra_dos_reis: { lat: -23.0067, lon: -44.3181, x: 68, y: 73 },
  belem: { lat: -1.4558, lon: -48.5039 },
  belo_horizonte: { lat: -19.9167, lon: -43.9345 },
  boa_vista: { lat: 2.8235, lon: -60.6758 },
  brasilia: { lat: -15.7939, lon: -47.8828 },
  campo_grande: { lat: -20.4697, lon: -54.6201 },
  cuiaba: { lat: -15.601, lon: -56.0974 },
  curitiba: { lat: -25.4284, lon: -49.2733 },
  florianopolis: { lat: -27.5949, lon: -48.5482 },
  fortaleza: { lat: -3.7319, lon: -38.5267 },
  goiania: { lat: -16.6869, lon: -49.2648 },
  joao_pessoa: { lat: -7.1195, lon: -34.845 },
  macapa: { lat: 0.0349, lon: -51.0694 },
  maceio: { lat: -9.6498, lon: -35.7089 },
  manaus: { lat: -3.119, lon: -60.0217 },
  natal: { lat: -5.7945, lon: -35.211 },
  palmas: { lat: -10.184, lon: -48.3336 },
  porto_alegre: { lat: -30.0346, lon: -51.2177 },
  porto_velho: { lat: -8.7608, lon: -63.8999 },
  recife: { lat: -8.0476, lon: -34.877 },
  rio_branco: { lat: -9.974, lon: -67.8243 },
  rio_de_janeiro: { lat: -22.9068, lon: -43.1729, x: 70, y: 73 },
  rio_grande: { lat: -32.035, lon: -52.0986 },
  salvador: { lat: -12.9777, lon: -38.5016 },
  sao_luis: { lat: -2.5297, lon: -44.3028 },
  sao_paulo: { lat: -23.5505, lon: -46.6333, x: 64, y: 75 },
  teresina: { lat: -5.0919, lon: -42.8034 },
  vitoria: { lat: -20.3155, lon: -40.3128 },
};

const STATE_POSITIONS: Record<string, CityPosition> = {
  ac: { lat: -9.0, lon: -70.0 },
  al: { lat: -9.6, lon: -36.7 },
  am: { lat: -4.0, lon: -64.5 },
  ap: { lat: 1.4, lon: -51.8 },
  ba: { lat: -12.5, lon: -41.7 },
  ce: { lat: -5.2, lon: -39.6 },
  df: { lat: -15.8, lon: -47.9 },
  es: { lat: -19.6, lon: -40.7 },
  go: { lat: -16.0, lon: -49.7 },
  ma: { lat: -5.0, lon: -45.3 },
  mg: { lat: -18.5, lon: -44.0 },
  ms: { lat: -20.5, lon: -54.5 },
  mt: { lat: -13.0, lon: -56.0 },
  pa: { lat: -3.8, lon: -52.5 },
  pb: { lat: -7.1, lon: -36.8 },
  pe: { lat: -8.4, lon: -37.8 },
  pi: { lat: -7.5, lon: -42.7 },
  pr: { lat: -24.7, lon: -51.5 },
  rj: { lat: -22.3, lon: -43.5, x: 69, y: 73 },
  rn: { lat: -5.8, lon: -36.6 },
  ro: { lat: -10.8, lon: -63.0 },
  rr: { lat: 1.9, lon: -61.4 },
  rs: { lat: -30.2, lon: -53.4 },
  sc: { lat: -27.2, lon: -50.3 },
  se: { lat: -10.6, lon: -37.4 },
  sp: { lat: -22.4, lon: -48.5, x: 62, y: 75 },
  to: { lat: -10.2, lon: -48.3 },
};

const BRAZIL_BOUNDS = {
  maxLat: 5.4,
  maxLon: -34.7,
  minLat: -34.0,
  minLon: -74.1,
};

function projectBrazilPoint(position: CityPosition) {
  if (typeof position.x === "number" && typeof position.y === "number") {
    return {
      x: position.x,
      y: position.y,
    };
  }

  const x =
    ((position.lon - BRAZIL_BOUNDS.minLon) / (BRAZIL_BOUNDS.maxLon - BRAZIL_BOUNDS.minLon)) * 100;
  const y =
    ((BRAZIL_BOUNDS.maxLat - position.lat) / (BRAZIL_BOUNDS.maxLat - BRAZIL_BOUNDS.minLat)) * 100;

  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(96, Math.max(4, y)),
  };
}

const STATE_NAME_TO_UF: Record<string, string> = {
  acre: "ac",
  alagoas: "al",
  amapa: "ap",
  amazonas: "am",
  bahia: "ba",
  ceara: "ce",
  distrito_federal: "df",
  espirito_santo: "es",
  goias: "go",
  maranhao: "ma",
  mato_grosso: "mt",
  mato_grosso_do_sul: "ms",
  minas_gerais: "mg",
  para: "pa",
  paraiba: "pb",
  parana: "pr",
  pernambuco: "pe",
  piaui: "pi",
  rio_de_janeiro: "rj",
  rio_grande_do_norte: "rn",
  rio_grande_do_sul: "rs",
  rondonia: "ro",
  roraima: "rr",
  santa_catarina: "sc",
  sao_paulo: "sp",
  sergipe: "se",
  tocantins: "to",
};

function normalizeCity(city: string) {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyLocation(value: string) {
  return normalizeCity(value).toLowerCase().replace(/\s+/g, "_");
}

function isWeakLocation(city: string) {
  return ["Local/privado", "Desconhecida", "Não detectada", "unknown"].includes(city);
}

function actorFromEntry(entry: Awaited<ReturnType<typeof summarizeAccessLogs>>["entries"][number]) {
  const login = typeof entry.metadata?.login === "string" ? entry.metadata.login : "";
  if (login) return login;

  const email = typeof entry.metadata?.email === "string" ? entry.metadata.email : "";
  if (email) return email;

  if (entry.event.startsWith("transparency_lead")) return "Lead da landing";
  if (entry.event.startsWith("login_")) return "Operador autenticando";
  if (entry.userAgent === "node") return "Servico automatizado";
  return "Visitante";
}

function actorFromRawLog(log: Awaited<ReturnType<typeof summarizeAccessLogs>>["rawLogs"][number]) {
  const login = typeof log.metadata?.login === "string" ? log.metadata.login : "";
  if (login) return login;

  const email = typeof log.metadata?.email === "string" ? log.metadata.email : "";
  if (email) return email;

  if (log.event.startsWith("transparency_lead")) return "Lead da landing";
  if (log.event.startsWith("login_")) return "Operador autenticando";
  if (log.userAgent === "node") return "Servico automatizado";
  return "Visitante";
}

function resolveMapPosition(input: { city?: string; region?: string; state?: string }) {
  const candidates = [input.city, input.state, input.region]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(slugifyLocation);

  for (const candidate of candidates) {
    if (CITY_POSITIONS[candidate]) {
      return CITY_POSITIONS[candidate];
    }

    if (STATE_POSITIONS[candidate]) {
      return STATE_POSITIONS[candidate];
    }

    if (candidate.length === 2 && STATE_POSITIONS[candidate]) {
      return STATE_POSITIONS[candidate];
    }

    const uf = STATE_NAME_TO_UF[candidate];
    if (uf && STATE_POSITIONS[uf]) {
      return STATE_POSITIONS[uf];
    }
  }

  return null;
}

export default async function MapaPage() {
  await appendAccessLog(await headers(), {
    event: "mapa_page_view",
    path: "/mapa",
  });

  const summary = await summarizeAccessLogs();
  const representativeByIp = new Map<string, Awaited<ReturnType<typeof summarizeAccessLogs>>["rawLogs"][number]>();

  for (const log of summary.rawLogs) {
    const current = representativeByIp.get(log.ip);
    const currentLocalCitado =
      typeof current?.metadata?.cidade === "string" && current.metadata.cidade
        ? String(current.metadata.cidade)
        : current?.city || "";
    const nextLocalCitado =
      typeof log.metadata?.cidade === "string" && log.metadata.cidade
        ? String(log.metadata.cidade)
        : log.city;

    const currentHasUsefulLocation =
      Boolean(current) &&
      (!isWeakLocation(current!.city) || Boolean(CITY_POSITIONS[slugifyLocation(currentLocalCitado)]));
    const nextHasUsefulLocation =
      !isWeakLocation(log.city) || Boolean(CITY_POSITIONS[slugifyLocation(nextLocalCitado)]);

    if (!current || (!currentHasUsefulLocation && nextHasUsefulLocation)) {
      representativeByIp.set(log.ip, log);
    }
  }

  function fallbackPositionForIp(ip: string) {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
    }
    const angle = (hash % 360) * (Math.PI / 180);
    const radius = 6 + ((hash >> 8) % 14);
    const x = 55 + Math.cos(angle) * radius;
    const y = 55 + Math.sin(angle) * radius;
    return {
      x: Math.min(94, Math.max(8, x)),
      y: Math.min(94, Math.max(8, y)),
    };
  }

  const entries = summary.entries
    .map((entry) => {
      const sourceLog = representativeByIp.get(entry.ip);
      const localCitado =
        typeof sourceLog?.metadata?.cidade === "string" && sourceLog.metadata.cidade
          ? String(sourceLog.metadata.cidade)
          : entry.city;
      const plottedCity = isWeakLocation(entry.city) ? localCitado : entry.city;
      const state =
        typeof sourceLog?.metadata?.estado === "string" && sourceLog.metadata.estado
          ? String(sourceLog.metadata.estado)
          : entry.region;
      const hasGeo =
        typeof entry.latitude === "number" && typeof entry.longitude === "number";
      const cityPosition = resolveMapPosition({
        city: plottedCity,
        region: entry.region,
        state,
      });
      const position = hasGeo
        ? { lat: entry.latitude!, lon: entry.longitude! }
        : cityPosition;
      const projectedPosition = position ? projectBrazilPoint(position) : null;
      const finalPosition = projectedPosition ?? fallbackPositionForIp(entry.ip);

      const userAgent = entry.userAgent || "unknown";
      const userAgentShort =
        userAgent.length > 72 ? `${userAgent.slice(0, 72)}…` : userAgent;

      return {
        key: `access-${entry.ip}-${entry.lastAccess}`,
        kind: "access" as const,
        accessCount: entry.accessCount,
        actor: sourceLog ? actorFromRawLog(sourceLog) : actorFromEntry(entry),
        city: plottedCity,
        country: entry.country,
        ip: entry.ip,
        lastAccess: entry.lastAccess,
        lastEvent: entry.event,
        lastPath: entry.path,
        localCitado,
        localPorIp: `${entry.city}${entry.region ? ` - ${entry.region}` : ""}`,
        mapped: hasGeo || Boolean(cityPosition),
        online: isAccessOnline(entry.lastAccess),
        region: entry.region,
        userAgentShort,
        x: finalPosition.x,
        y: finalPosition.y,
      };
    });

  const onlineCount = entries.filter((entry) => entry.online).length;

  const situacaoLabel: Record<string, string> = {
    candidato: "Candidato(a)",
    politica: "Trabalha com política",
    outro: "Outro",
  };

  const cadastroEntries = (await readOnboardingLog()).map((c) => {
    const cityPosition = resolveMapPosition({ city: c.cidade, state: c.uf });
    const projected = cityPosition ? projectBrazilPoint(cityPosition) : null;
    const finalPosition =
      projected ?? fallbackPositionForIp(c.ip || c.uid || c.nome);
    const contato = [c.whatsapp, c.email].filter(Boolean).join(" · ") || "—";
    const localPorIp = [c.cidade, c.uf].filter(Boolean).join(" - ");

    return {
      key: `cadastro-${c.uid || c.at}`,
      kind: "cadastro" as const,
      accessCount: 1,
      actor: `${c.nome}${c.situacao ? ` · ${situacaoLabel[c.situacao] ?? c.situacao}` : ""}`,
      city: c.cidade || "Cadastro",
      country: "Brasil",
      ip: c.ip || "—",
      lastAccess: c.at,
      lastEvent: `onboarding:${c.situacao}`,
      lastPath: "/m",
      localCitado: localPorIp,
      localPorIp,
      mapped: Boolean(cityPosition),
      online: isAccessOnline(c.at),
      region: c.uf,
      userAgentShort: contato,
      note: c.pergunta || undefined,
      x: finalPosition.x,
      y: finalPosition.y,
    };
  });

  const allEntries = [...entries, ...cadastroEntries];

  return (
    <AccessMap
      entries={allEntries}
      totalAccesses={summary.totalAccesses}
      uniqueIps={summary.uniqueIps}
      onlineCount={onlineCount}
    />
  );
}
