# Progresso — mobile `/m` (execução do `composer.md`)

Documento **incremental**: o que foi pedido no prompt, o que já foi feito, o que falta validar em produção. Atualize este arquivo a cada entrega (não substitua o `wow.md` — aquele é o mapa de fontes; este é o diário de execução).

**Prompt de referência:** [`composer.md`](composer.md)  
**Mapa de dados reais:** [`wow.md`](wow.md)  
**Última atualização:** 2026-06-12

---

## Resumo executivo

| Tarefa | Escopo | Código | Lint/Build | Validado em runtime |
|--------|--------|--------|------------|---------------------|
| T1 YouTube por vídeo | Redes | ✅ | ✅ | ⚠️ vídeos OK em dev; VPS bloqueado (bot yt-dlp) → fallback |
| T2 Plenário real | Plenário | ✅ | ✅ | ✅ API Câmara (órgão 180 + parse placar) |
| T3 Google Trends | Menções (idx) | ✅ | ✅ | ✅ fallback modelado (série zerada dev + VPS) |
| T4 Votos 2022 TSE | Mapa RJ + comparativo | ✅ | ✅ | ✅ constante (sem fetch) |
| T5 Tags modelado | UI abas | ✅ | ✅ | ✅ tags em redes/pesquisas/radar/voz |
| T6 Atualizar wow.md | Docs | ✅ | — | ✅ |

**Legenda:** ✅ feito · ⏳ pendente de validação · ❌ não iniciado · 🔄 em andamento

---

## Fontes reais — antes vs depois desta rodada

| Fonte | Antes | Depois |
|-------|-------|--------|
| Imprensa | real (Google News) | real |
| Sentimento | real (pysentimiento) | real |
| Seguidores (índice) | real (YouTube inscritos) | real |
| Gastos | real (Câmara CEAP) | real |
| Pesquisas presidenciais | real (Wikipédia) | real |
| **YouTube por vídeo** | modelado na aba Redes | **real** (`/youtube/videos`) |
| **Plenário** | 100% simulação | **real** com fallback modelado |
| **Menções (idx)** | modelado | **real** se Trends responder |
| **Votos 2022** | hash mock no mapa | **constante TSE** |
| X / IG / TikTok / FB | modelado | modelado (fora de escopo) |

---

## T1 — Redes: YouTube real por vídeo

**Status:** ✅ código entregue · ✅ validado com sidecar local (2026-06-12)

### Checklist do `composer.md`

- [x] Sidecar `GET /youtube/videos?channel=&n=10` (`yt-dlp`, sem `extract_flat`)
- [x] `lib/sources/youtube.ts` — `getVideosReal()`, `ensureFreshYoutubeVideos()`, cache `data/youtube-videos-cache.json`, TTL 6h
- [x] `lib/live-schemas.ts` — `YoutubeVideoSchema`, campo opcional `youtubeVideos` em `RedesV2Snapshot`
- [x] `lib/live-mock-v2.ts` — injeção em `snapshotRedesV2`
- [x] `app/api/stream/route.ts` — `ensureFreshYoutubeVideos()` na conexão e no intervalo
- [x] `components/mobile/tabs/redes/index.tsx` — card `YoutubeVideosReais` + tag `real`; demais blocos com tag `modelado`
- [x] `npm run lint` + `npm run build`

### Arquivos tocados

- `sidecar/sentiment/app.py`
- `lib/sources/youtube.ts`
- `lib/live-schemas.ts`
- `lib/live-mock-v2.ts`
- `app/api/stream/route.ts`
- `components/mobile/tabs/redes/index.tsx`

### Como validar

1. Subir sidecar: `uvicorn app:app --host 127.0.0.1 --port 8088` em `sidecar/sentiment/`
2. Abrir `/m/redes` autenticado — deve aparecer card **YouTube · últimos vídeos** com tag `real · yt-dlp`
3. Sem sidecar: aba continua no sintético (sem quebrar)

---

## T2 — Plenário real (Câmara Dados Abertos)

**Status:** ✅ código entregue · ✅ validado com API ao vivo (`scripts/validate-plenario.mjs`)

### Checklist do `composer.md`

- [x] `lib/sources/plenario.ts` — `getPlenarioReal()`, `ensureFreshPlenario()`, cache `data/plenario-cache.json`, TTL 1h
- [x] `lib/live-mock.ts` — `snapshotPlenario()` prefere real; simulação com `?demo=votacao`
- [x] `lib/live-schemas.ts` — campo opcional `fonte: "real" | "modelado"` em `PlenarioState`
- [x] `app/api/stream/route.ts` — `ensureFreshPlenario()`
- [x] `components/mobile/tabs/plenario/index.tsx` — badge real/modelado
- [x] lint + build

### Arquivos tocados

- `lib/sources/plenario.ts` (novo)
- `lib/live-mock.ts`
- `lib/live-schemas.ts`
- `app/api/stream/route.ts`
- `components/mobile/tabs/plenario/index.tsx`

### Notas

- Votação **simulada** ainda ativa quando `?demo=votacao` ou quando a API não retorna dado.
- `vozes` e `caboDeGuerra` seguem modelados (não havia endpoint grátis confiável no escopo).

---

## T3 — Google Trends (buzz de busca → menções)

**Status:** ✅ código entregue · ⚠️ `/trends` responde; índice pode vir `0` fora do VPS

### Checklist do `composer.md`

- [x] `pytrends` em `sidecar/sentiment/requirements.txt`
- [x] Sidecar `GET /trends?termo=`
- [x] `lib/sources/trends.ts` — `getTrendsReal()`, `hasTrendsReal()`, `ensureFreshTrends()`
- [x] `lib/live-mock.ts` — `idxComponents().mencoes` usa Trends com fallback
- [x] `lib/live-schemas.ts` — `fontes` opcional em `IdxSnapshot` / `IdxDelta`
- [x] `app/api/stream/route.ts` — `ensureFreshTrends()`
- [x] `signal-cards.tsx` — tag `real · Google Trends` quando `fontes.mencoes === "real"`
- [x] lint + build

### Arquivos tocados

- `sidecar/sentiment/app.py`, `requirements.txt`
- `lib/sources/trends.ts` (novo)
- `lib/live-mock.ts`, `lib/live-schemas.ts`
- `app/api/stream/route.ts`
- `components/mobile/tabs/ticker/signal-cards.tsx`
- `components/mobile/tabs/ticker/sost-idx-card.tsx` (texto do tooltip)

### Como validar

- Card **Menções** no ticker: tag `real · Google Trends` ou `modelado` conforme sidecar.
- Se bloqueado: índice cai no sintético — app não quebra.

---

## T4 — Votos 2022 do Sóstenes (TSE)

**Status:** ✅ concluído (dado estático, sem fetch)

### Checklist do `composer.md`

- [x] `lib/data/votos-2022-sostenes.ts` — total 152.763 + principais municípios RJ
- [x] `data/watchlist.json` — `principal.votos2022: 152763`
- [x] `lib/watchlist.ts` — schema + default com `votos2022`
- [x] `components/mobile/tabs/rio/mapa-rj.tsx` — camada `v2022` usa `getVotos2022Municipio()`
- [x] `components/mobile/tabs/ticker/competitor-tape.tsx` — cita base 2022 no comparativo
- [x] lint + build

### Pendência opcional (fora do escopo atual)

- [ ] Completar `porMunicipio` para os 92 municípios do geojson (hoje: top ~20 + fallback proporcional)

---

## T5 — Tags "modelado" nas abas restantes

**Status:** ✅ concluído · ✅ validado (`validate-mobile.mjs` + revisão de cards)

### Checklist do `composer.md`

- [x] `redes/index.tsx` — `FonteTag` em **todos** os blocos sintéticos; YouTube vídeos com `real`
- [x] `pesquisas/index.tsx` — tag `modelado` na pesquisa própria
- [x] `radar/index.tsx` — tag `modelado` no feed de imprensa
- [x] `voz/index.tsx` — tag `modelado` no hero
- [x] lint + build

### Já existiam (ticker)

- `signal-cards.tsx`, `national-actors.tsx` — padrão `.m-signal-tag.mock/.real` em `app/m/m.css`

---

## T6 — Atualizar `wow.md`

**Status:** ✅ concluído

- [x] Itens T1–T4 movidos para tabela **Dados REAIS no ar**
- [x] Seção **O que falta** reduzida (X/IG/TikTok/FB, radar/voz/pesquisa própria)
- [x] Stack atualizada com `pytrends`

---

## SSE — `ensureFresh*` registrados

Arquivo: `app/api/stream/route.ts`

| Função | TTL aprox. | Cache |
|--------|------------|-------|
| `ensureFreshNews` | (google-news) | `data/google-news-cache.json` |
| `ensureFreshCamara` | 6h | `data/camara-cache.json` |
| `ensureFreshSentimento` | — | memória |
| `ensureFreshYoutube` | 12h | `data/youtube-cache.json` |
| **`ensureFreshYoutubeVideos`** | 6h | `data/youtube-videos-cache.json` |
| **`ensureFreshPlenario`** | 1h | `data/plenario-cache.json` |
| **`ensureFreshTrends`** | 6h | `data/trends-cache.json` |
| `ensureFreshPesquisas` | — | `data/pesquisas-cache.json` |

---

## Deploy / próximos passos

### VPS (`/opt/candidato`, pm2 `candidato` + `sentiment`)

- [x] `git pull` + `npm run build` + `pm2 restart candidato` — commit `aed2f33`, build v4.17
- [x] Sidecar: `pip install pytrends` + `pm2 restart sentiment`
- [x] `validate-plenario.mjs` + `validate-mobile.mjs` OK no VPS
- [x] Plenário real (`fonte: real`) confirmado no servidor
- [x] Trends: `{"indice":null}` no VPS → menções ficam **modelado** (esperado)
- [ ] Smoke visual `/m` no browser (login + abas) — manual
- **Nota T1 VPS:** `/youtube/videos` retorna `[]` (YouTube anti-bot no datacenter); `/youtube` inscritos funciona; app cai no sintético sem erro

### Fora do escopo do `composer.md` (permanecem modelados)

- Menções sociais X (twscrape + credencial)
- Instagram / TikTok / Facebook
- Radar, Voz, Pesquisa própria (dados de campo/CRM)
- Cockpit desktop (`campaign-data.ts` etc.)

---

## Log incremental

| Data | Entrega | Notas |
|------|---------|-------|
| 2026-06-12 | Criado `composer.md` | Prompt para Composer 2.5 (T1–T6) |
| 2026-06-12 | Execução T1–T6 | Código + `wow.md` atualizado; lint e build OK |
| 2026-06-12 | Criado `progresso.md` | Este arquivo — diário de status |
| 2026-06-12 | Fix T2 plenário | `idOrgao=180`, parse placar da `descricao`; removido `/deputados/{id}/votacoes` (405) |
| 2026-06-12 | Validação T2 | `validate-plenario.mjs` OK; cache `data/plenario-cache.json` gerado |
| 2026-06-12 | Sidecar dev | venv em `sidecar/sentiment/.venv`; lazy-load pysentimiento; T1 OK via `validate-sources.mjs` |
| 2026-06-12 | Validação T3 | `/trends` HTTP 200; série zerada no Windows dev — validar de novo no VPS |
| 2026-06-12 | T5 completo | `FonteTag` em todos os cards sintéticos de `redes/index.tsx` |
| 2026-06-12 | T3 fix | Rejeita série/índice zerados → fallback modelado em `app.py` + `trends.ts` |
| 2026-06-12 | Scripts | `validate-mobile.mjs`, `validate-plenario.mjs`, `validate-sources.mjs` |
| 2026-06-12 | Deploy VPS | `aed2f33` em `/opt/candidato`; pm2 `candidato` + `sentiment` reiniciados |
| 2026-06-12 | Validação VPS | Plenário real OK; Trends/YouTube-videos bloqueados → fallback modelado |

### Notas T2 (correção API)

- `/deputados/178947/votacoes` retorna **405** — não usar.
- `/votacoes/{id}/votos` retorna **400** em muitas votações recentes.
- Placar confiável vem do regex em `descricao` (ex.: `Sim: 343; Não: 97`).

---

*Atualize a tabela **Log incremental** e os checkboxes ⏳→✅ conforme validar em dev/VPS.*
