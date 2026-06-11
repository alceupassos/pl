// Mapa central de avatares (atores políticos e personas) usado no /m.
// Puro (sem "use client") — importável de server e client components.

export const AVATARS: Record<string, string> = {
  SOST: "/sostenes1.png",
  JRDY: "/candidatos/carlos_jordy_PL.png",
  DLUZ: "/candidatos/dr_luizinho_psb.png",
  lula: "/ai/fig-lula.png",
  "flavio-bolsonaro": "/ai/fig-flavio-bolsonaro.png",
  "renan-santos": "/ai/fig-renan-santos.png",
  lindbergh: "/ai/fig-lindbergh-farias.png",
  "church-leader": "/ai/avatar-lider-igreja.png",
  "regional-manager": "/ai/avatar-gerente-regional.png",
  "state-deputy": "/ai/avatar-deputado.png",
  cabo: "/ai/avatar-cabo.png",
  eleitor: "/ai/avatar-eleitor.png",
};

export function getAvatar(key: string): string | null {
  return AVATARS[key] ?? null;
}

// Iniciais: 1ª letra dos 2 primeiros nomes, em maiúsculas (ex.: "Carlos Jordy" → "CJ").
export function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
