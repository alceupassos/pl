# 🚀 WOW — Tecnologia de dados reais do Cockpit do Candidato

Documento vivo: **como cada dado REAL é capturado**, com qual tecnologia open-source, o que já está no ar e o que falta. Atualizado a cada entrega.

> Princípio: **só fontes gratuitas e open-source**, sem API paga. Cada fonte tem **cache + fallback ao sintético** (o app nunca quebra) e mostra **tag "modelado"** onde o dado ainda não é real.

---

## 🏗️ Arquitetura (como o dado real chega na tela)

```
Fonte externa (grátis)  ──►  lib/sources/<fonte>.ts  ──►  canal SSE  ──►  card no /m
   (Wikipédia, Câmara,         (fetch assíncrono             (live-mock      (React + ECharts,
    Google News, YouTube)       + cache + fallback)           injeta o real)   flip 3D no verso)
                                       ▲
                          sidecar Python (127.0.0.1:8088)
                          pysentimiento · yt-dlp · pandas · pytrends
```

- **`lib/sources/*.ts`** — cada fonte: fetcher assíncrono fora de banda (TTL), getter **síncrono** que o tick do SSE lê, cache em disco (`data/*-cache.json`, gitignored) e **fallback** ao mock.
- **Sidecar Python** (`sidecar/sentiment/`, pm2 `sentiment`, `127.0.0.1:8088`) — o único lugar com Python: IA de sentimento, yt-dlp, pandas/lxml, pytrends. Disparado pelo Node via HTTP local.
- **SSE** (`app/api/stream/route.ts`) — `ensureFresh*()` mantém cada fonte fresca; o snapshot injeta o valor real quando há, senão usa a série sintética.
- **Deploy**: VPS `/opt/candidato` (pm2 `candidato`, porta 3030), versão `v4.x` no header sobe sozinha a cada build.

---

## ✅ Dados REAIS no ar

| Dado | Tecnologia / fonte (grátis) | Como | Arquivo |
|---|---|---|---|
| **Imprensa** (volume + manchetes/alertas) | **Google News RSS** + `fast-xml-parser` | RSS por nome do candidato; volume vira índice ~100, manchetes viram alertas | `lib/sources/google-news.ts` |
| **Sentimento** (tom das notícias) | **pysentimiento** (BERTabaporu, IA em PT) no **sidecar** | pontua as manchetes reais → índice de clima | `sidecar/sentiment/app.py` + `lib/sources/sentiment.ts` |
| **Seguidores** (índice) | **yt-dlp** (sem chave) | inscritos do canal do YouTube do Sóstenes (~5.060) | `lib/sources/youtube.ts` (sidecar `/youtube`) |
| **Gastos** (cota parlamentar) | **Câmara Dados Abertos** (API oficial JSON) | despesas reais do dep. 178947 por categoria/mês | `lib/sources/camara.ts` |
| **Pesquisas presidenciais** | **Wikipédia** + **pandas.read_html** (+lxml) no sidecar | tabela das últimas pesquisas (Lula/Flávio/Caiado/Zema/Renan) — instituto, data, % | `sidecar/sentiment/app.py` `/pesquisas` + `lib/sources/pesquisas.ts` |
| **Redes — YouTube** (views/comentários/engajamento por vídeo) | **yt-dlp** `--dump-json` no sidecar | últimos ~10 vídeos do canal → aba Redes (`youtubeVideos`) | `sidecar/sentiment/app.py` `/youtube/videos` + `lib/sources/youtube.ts` |
| **Redes — Instagram** (seguidores) | **Graph API** (`business_discovery`) | candidato + concorrentes da watchlist → badge verde na aba Redes | `sidecar/sentiment/app.py` `/instagram/*` + `lib/sources/instagram.ts` |
| **Redes — Facebook** (seguidores página candidato) | **Graph API** (`fan_count`) | página do candidato → aba Redes | `sidecar/sentiment/app.py` `/facebook` + `lib/sources/facebook.ts` |
| **Redes — X** (seguidores) | **twifork** + cookies (`X_COOKIES`) | perfis da watchlist → aba Redes | `sidecar/sentiment/app.py` `/x/*` + `lib/sources/x.ts` |
| **Plenário** (votações do dep. 178947) | **Câmara Dados Abertos** | votações recentes + placar agregado; fallback à simulação com `?demo=votacao` | `lib/sources/plenario.ts` |
| **Buzz de busca** (menções no índice) | **Google Trends** (`pytrends` no sidecar) | interesse de busca normalizado ~100 → `idx.sost.breakdown.mencoes` | `sidecar/sentiment/app.py` `/trends` + `lib/sources/trends.ts` |
| **Votos 2022 do Sóstenes** (comparativo + mapa RJ) | **TSE** (constante histórica) | 152.763 votos totais + por município → watchlist, mapa `v2022`, comparativo | `lib/data/votos-2022-sostenes.ts` |

**Truques que destravaram cada fonte:**
- GDELT dava **429** (throttle) → trocado por **Google News RSS** (sem limite).
- Wikipédia bloqueia User-Agent padrão → `requests` com **UA descritivo** + `pandas.read_html`.
- X exige **cookies de conta logada** (twifork) — datacenter puro bloqueia; com `X_COOKIES` no sidecar funciona.
- Instagram/Facebook usam **Graph API oficial** — precisa `META_ACCESS_TOKEN` + IDs no env do sidecar.
- `pandas` já vinha junto do `pysentimiento` → reúso pro parse de pesquisas.
- YouTube por vídeo: `extract_flat: false` no `/youtube/videos` para vir `view_count` e `comment_count`.
- Google Trends: datacenter às vezes bloqueia → retorna vazio e cai no sintético (tag `modelado`).

---

## 🔜 O que falta (e a tecnologia planejada — toda grátis)

| Dado | Tecnologia open-source | Status |
|---|---|---|
| **Redes — TikTok** (seguidores/engajamento) | scrapers | **modelado** (bloqueio datacenter) |
| **Redes — engajamento IG/X/FB** (além de seguidores) | Graph API / twifork | **modelado** por enquanto (só contagem de seguidores é real quando credenciais configuradas) |
| **Facebook concorrentes** | Graph API | **modelado** (API não expõe páginas de terceiros sem app review) |
| **Radar / Voz / Pesquisa própria** | CRM / WhatsApp / campo | **modelado** até integração com dados reais |

---

## 🧩 Stack
Next.js 16 (App Router, Turbopack) · React 19 · ECharts · Zod (validação dos canais) · SSE · PM2 · Python (FastAPI + pysentimiento + yt-dlp + pandas/lxml + **pytrends**) · Node `pg` (preparado p/ Postgres do VPS).

---
*Atualizado conforme cada fonte entra no ar.*
