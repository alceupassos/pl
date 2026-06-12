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
                          pysentimiento · yt-dlp · pandas
```

- **`lib/sources/*.ts`** — cada fonte: fetcher assíncrono fora de banda (TTL), getter **síncrono** que o tick do SSE lê, cache em disco (`data/*-cache.json`, gitignored) e **fallback** ao mock.
- **Sidecar Python** (`sidecar/sentiment/`, pm2 `sentiment`, `127.0.0.1:8088`) — o único lugar com Python: IA de sentimento, yt-dlp, pandas/lxml. Disparado pelo Node via HTTP local.
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

**Truques que destravaram cada fonte:**
- GDELT dava **429** (throttle) → trocado por **Google News RSS** (sem limite).
- Wikipédia bloqueia User-Agent padrão → `requests` com **UA descritivo** + `pandas.read_html`.
- X/Bluesky bloqueiam **IP de datacenter** sem login → ficam modelados.
- `pandas` já vinha junto do `pysentimiento` → reúso pro parse de pesquisas.

---

## 🔜 O que falta (e a tecnologia planejada — toda grátis)

| Dado | Tecnologia open-source | Status |
|---|---|---|
| **Redes — YouTube** (views/comentários/engajamento por vídeo) | **yt-dlp** `--dump-json` | → próximo (sem credencial) |
| **Plenário** (votações/proposições/presença) | **Câmara Dados Abertos** (estender cliente) | planejado (sem credencial) |
| **Buzz de busca** | **Google Trends** (`pytrends` no sidecar) | planejado (datacenter às vezes bloqueia) |
| **Menções sociais X** | **twscrape** (open-source) | só com conta(s) X do usuário (ToS/risco) |
| **Instagram / TikTok / Facebook** | instaloader / scrapers | ❌ bloqueiam datacenter / exigem login/pago → **modelado** |
| **Votos 2022 do Sóstenes** (comparativo) | TSE resultados | buscar e gravar constante |

---

## 🧩 Stack
Next.js 16 (App Router, Turbopack) · React 19 · ECharts · Zod (validação dos canais) · SSE · PM2 · Python (FastAPI + pysentimiento + yt-dlp + pandas/lxml) · Node `pg` (preparado p/ Postgres do VPS).

---
*Atualizado conforme cada fonte entra no ar.*
