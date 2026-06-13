---
name: pesquisar-redes-candidatos
description: Pesquisa na web os perfis/canais OFICIAIS de redes sociais (Instagram, TikTok, Facebook, X, LinkedIn, YouTube) de cada candidato da watchlist do cockpit e grava os handles em data/watchlist.json. Use quando o usuário pedir para "pesquisar as redes dos candidatos", "achar os perfis oficiais", "atualizar/preencher os handles da watchlist", "arrumar os dados das redes sociais" ou trazer seguidores reais (Bright Data) para o cockpit /m.
---

# Pesquisar redes sociais oficiais dos candidatos

Encontra o **perfil oficial** de cada candidato em cada rede e grava o `handle` na
watchlist, que é o que destrava a coleta real (Bright Data/yt-dlp) no pipeline
`app/api/stream/route.ts` → `lib/sources/*` → sidecar. **Nunca invente um handle**: rede sem
perfil oficial confiável fica de fora (o card cai no sintético, sem marcar como real).

## Quem pesquisar

Leia os candidatos de `lib/watchlist.ts` (`DEFAULT_WATCHLIST`): `principal`,
`concorrentes_rj[]` e `atores_nacionais[]`. Use `nome` + `partido` + `uf`/contexto (RJ,
deputado federal, etc.) para desambiguar homônimos.

## Redes e formato do handle

Grave os handles no objeto `handles` de cada candidato. Formato esperado (ver
`sidecar/sentiment/social_gateways.py` `PROFILE_URL` e `lib/sources/youtube.ts`):

| rede | chave | valor a gravar | exemplo |
|---|---|---|---|
| Instagram | `instagram` | username sem `@` | `sostenescavalcante` |
| TikTok | `tiktok` | username sem `@` | `sostenes` |
| Facebook | `facebook` | slug/username da página | `sostenescavalcante` |
| X (Twitter) | `x` | username sem `@` | `sostenes` |
| LinkedIn | `linkedin` | slug de `/in/<slug>` | `sostenes-cavalcante` |
| YouTube | `youtube` | URL completa do canal (`/channel/UC…` ou `/@handle`) | `https://www.youtube.com/@...` |

## Workflow

1. **Listar** os candidatos da watchlist (nome/partido/UF).
2. Para **cada candidato × rede**, rodar `WebSearch` (ex.: `"<nome>" <partido> instagram oficial`)
   e abrir os resultados com `WebFetch` para confirmar. Pode paralelizar por candidato com o
   Agent tool, um agente por candidato, retornando JSON `{instagram,tiktok,facebook,x,linkedin,youtube,evidencia}`.
3. **Validar oficialidade** (descartar fan/fake/homônimo) — exigir ao menos um sinal forte:
   - selo verificado, OU
   - link cruzado de fonte oficial (site do partido/mandato, Wikipédia, Linktree do candidato,
     bio de outra rede oficial dele), OU
   - contagem de seguidores e conteúdo coerentes com a figura pública + nome/UF batendo.
   Na dúvida, **deixe vazio** aquela rede.
4. **Registrar evidência**: para cada handle aceito, guarde a URL que comprovou (para o relatório).
5. **Gravar na watchlist** (ver abaixo).
6. **Relatório final**: tabela candidato × rede com handle + URL de evidência, e a lista do que
   ficou vazio e por quê.

## Gravar na watchlist

A watchlist é validada por Zod (`WatchlistSchema`); `HandlesSchema = z.record(string,string)`
aceita qualquer rede. Dois alvos:

- **Runtime**: `data/watchlist.json` — é o que o app lê (`readWatchlist`). Gravar pela função
  oficial `writeWatchlist()` em `lib/watchlist.ts` (valida + invalida cache). Use um script
  Node único (`node -e` ou arquivo temporário em `scripts/`) que: lê a watchlist atual
  (`readWatchlist`), faz merge dos `handles` por candidato (casando por `nome`), e chama
  `writeWatchlist`. Não sobrescreva outros campos.
- **Default embutido**: atualizar também `handles` de cada candidato em `DEFAULT_WATCHLIST`
  (`lib/watchlist.ts`) para o fallback embutido já nascer com os perfis.

Depois de gravar: `pm2 restart sentiment` recarrega os dataset IDs do sidecar; o `candidato`
relê a watchlist no próximo tick do SSE.

## Não fazer

- Não embutir credenciais/API keys na skill nem no relatório.
- Não inventar handle nem "chutar" por padrão de nome — sem evidência, fica vazio.
- Não mexer em `pesosIndice`, `votos2022` ou outros campos da watchlist.
