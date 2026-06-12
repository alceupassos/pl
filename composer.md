# Prompt — Terminar o mobile `/m` (dados reais do wow.md)

> Prompt autocontido para o **Composer 2.5**. Execute as tarefas **T1 → T6 em ordem**, uma por vez.
> Regra de ouro: ao final de cada tarefa rode `npm run lint` e `npm run build`; ambos têm que passar **antes** de iniciar a próxima. Não há test runner — não invente `npm test`.

---

## 1. Contexto do projeto

- **Repo**: `politica-cockpit` (Next.js 16 App Router + Turbopack, React 19, TypeScript `strict`, alias `@/*` → raiz do repo).
- **O `/m`**: dashboard mobile do candidato **Sóstenes Cavalcante** (deputado federal PL-RJ, id Câmara **178947**, canal YouTube `UCI2j76o7JyLVSmooEcSvLxA`). Páginas em `app/m/`, abas em `components/mobile/tabs/`: `ticker`, `radar`, `voz`, `redes`, `pesquisas`, `gastos`, `plenario`, `rio`, `c2026`, `equipe`, `oportunidades`.
- **Fluxo de dados** (leia antes de tocar em qualquer coisa):

```
Fonte externa grátis ─► lib/sources/<fonte>.ts ─► lib/live-mock*.ts ─► SSE (app/api/stream) ─► LiveStore ─► aba /m
   (Câmara, YouTube,      (ensureFresh + getter         (snapshot injeta      (Zod valida        (useLiveChannel)
    Wikipédia, Trends)     síncrono + cache + fallback)   o real OU sintético)  cada envelope)
                                   ▲
                       sidecar Python FastAPI (127.0.0.1:8088)
                       pysentimiento · yt-dlp · pandas/lxml · (pytrends a adicionar)
```

- **Sidecar Python**: `sidecar/sentiment/app.py` (FastAPI, pm2 `sentiment`, `127.0.0.1:8088`). Único lugar com Python. Endpoints atuais: `/health`, `POST /sentiment`, `/youtube?channel=`, `/pesquisas`. Deps em `sidecar/sentiment/requirements.txt`.
- **SSE**: `app/api/stream/route.ts` — a cada 1s chama os `ensureFresh*()` e emite deltas por canal conforme `CHANNEL_CADENCE_MS`.
- **Schemas**: `lib/live-schemas.ts` — 17 canais, cada envelope validado por Zod (`CHANNEL_SCHEMAS[ch][kind]`). **Nunca** quebre um schema existente; só **estenda** com campos **opcionais** (`.optional()`).
- **Geradores**: `lib/live-mock.ts` e `lib/live-mock-v2.ts` — produzem snapshots/deltas determinísticos e fazem `getXReal() ?? sintético`.

### Princípios herdados do `wow.md` (não negociáveis)

1. **Só fontes gratuitas / open-source.** Nenhuma API paga, nenhuma credencial nova.
2. **Cache + fallback sempre.** Toda fonte real grava cache em `data/*-cache.json` (gitignored) e, quando não há dado, cai no sintético. **O app nunca pode quebrar** por uma fonte fora do ar.
3. **Tag "modelado".** Todo dado ainda sintético exibido na UI mostra a tag `modelado`; dado real mostra `real`. CSS já existe: `.m-signal-tag.mock` / `.m-signal-tag.real` em `app/m/m.css`.
4. **Ambiente Windows 11 + PowerShell 5.1** (`powershell.exe`): sem `&&`/`||`, encoding UTF-16 default, evite `2>&1` em exes nativos. Verifique com `npm run lint` + `npm run build`.
5. **Não tocar no cockpit desktop** (`components/campaign-data.ts`, `campaign-cockpit.tsx`, `campaign-charts.ts` etc.). O trabalho é só no `/m` e nas fontes que o alimentam.

---

## 2. Padrão OBRIGATÓRIO para plugar uma fonte real

Espelhe `lib/sources/camara.ts` e `lib/sources/youtube.ts`. Toda nova fonte segue exatamente este contrato:

```ts
// lib/sources/<fonte>.ts
const TTL_MS = /* janela apropriada */;
const CACHE_FILE = join(process.cwd(), "data", "<fonte>-cache.json");

let state = { at: 0, /* ...valor... */ };
let inFlight = false;

(function loadDisk() { try { /* readFileSync + JSON.parse → state */ } catch {} })();

/** Getter SÍNCRONO que o snapshot lê. Retorna null quando não há dado real. */
export function get<Fonte>Real(): T | null { /* ... */ }

/** Dispara o refresh se o TTL venceu. NÃO bloqueia (fire-and-forget). */
export function ensureFresh<Fonte>(): void {
  if (inFlight) return;
  if (Date.now() - state.at < TTL_MS && /* tem valor */) return;
  inFlight = true;
  void refresh().finally(() => { inFlight = false; });
}

async function refresh(): Promise<void> {
  try { /* fetch (sidecar ou API direta) com AbortController/timeout; atualiza state; persist() */ }
  catch { /* mantém último bom; nunca propaga erro */ }
}

function persist(): void { try { writeFileSync(CACHE_FILE, JSON.stringify(...) + "\n"); } catch {} }
```

Depois, conecte em 2 lugares:

1. **`app/api/stream/route.ts`** — importe e chame `ensureFresh<Fonte>()` dentro do `setInterval` (junto dos outros `ensureFresh*`). Se a fonte for barata, chame também na conexão (perto de `ensureFreshNews`/`ensureFreshCamara`).
2. **`lib/live-mock.ts` ou `lib/live-mock-v2.ts`** — no snapshot/delta do canal, use `get<Fonte>Real() ?? <valorSintético>`.

Sidecar Python só quando precisar de lib que não existe em JS (yt-dlp, pandas, pytrends). Endpoint novo em `sidecar/sentiment/app.py` + dep em `requirements.txt`; o Node faz `fetch` no `SIDECAR_BASE` (derivado de `SENTIMENT_URL`, ver topo de `youtube.ts`).

---

## 3. Tarefas

### T1 — Redes: YouTube real por vídeo

**Objetivo**: trazer views/comentários/engajamento dos últimos vídeos do canal para a aba `redes`. Hoje `redes/index.tsx` consome `snapshotRedesV2` 100% sintético; o YouTube real só alimenta `idx.sost.breakdown.seguidores`.

**Faça**:
1. **Sidecar** (`sidecar/sentiment/app.py`): novo endpoint `GET /youtube/videos?channel=...&n=10` que usa `yt-dlp --dump-json` (sem `extract_flat`, para vir `view_count`, `comment_count`, `like_count`, `upload_date`, `title`) dos últimos ~10 vídeos. Trate canal sem dado retornando lista vazia.
2. **`lib/sources/youtube.ts`**: adicione `getVideosReal(): VideoReal[] | null` + estado/cache próprios (pode reusar `data/youtube-cache.json` com um campo `videos`, ou novo `data/youtube-videos-cache.json`; TTL ~6h). Tipo `VideoReal = { id, titulo, views, comentarios, likes, data, engajamento }` (engajamento = (likes+coments)/views * 100). Exponha `ensureFreshYoutubeVideos()`.
3. **`lib/live-schemas.ts`**: estenda `RedesV2SnapshotSchema` com um campo **opcional** `youtubeVideos: z.array(...).optional()` (e o delta correspondente se fizer sentido). Não altere os campos existentes.
4. **`lib/live-mock-v2.ts`** (`snapshotRedesV2`): injete `getVideosReal()` no novo campo; quando `null`, omita o campo (a UI mostra modelado). O bloco YouTube vira `real`; as demais redes (IG/X/TikTok/FB) continuam sintéticas com tag `modelado`.
5. **`app/api/stream/route.ts`**: chame `ensureFreshYoutubeVideos()` no intervalo.
6. **`components/mobile/tabs/redes/index.tsx`**: renderize os vídeos reais quando presentes, com tag `real`; mantenha o resto com tag `modelado`.

**Pronto quando**: aba redes mostra vídeos reais (ou cai no sintético sem erro), lint e build passam.

---

### T2 — Plenário real (Câmara Dados Abertos)

**Objetivo**: substituir a simulação de `snapshotPlenario()` por votações/proposições/presença reais do dep. 178947, mantendo a simulação como fallback fora de sessão de votação.

**Faça**:
1. **`lib/sources/plenario.ts`** (novo): cliente da API Câmara (sem credencial):
   - `https://dadosabertos.camara.leg.br/api/v2/deputados/178947/votacoes` (ou `/proposicoes` + `/eventos` conforme disponível) e votos do deputado.
   - `getPlenarioReal(): PlenarioReal | null`, `ensureFreshPlenario()`, cache `data/plenario-cache.json`, TTL ~1h.
2. **`lib/live-mock.ts`** (`snapshotPlenario`): use `getPlenarioReal()` quando houver; senão mantém a simulação atual (votação ter–qui 15h–17h / `?demo=votacao`). Não mude a forma do `PlenarioState` se não precisar; se precisar, só campos opcionais em `lib/live-schemas.ts`.
3. **`app/api/stream/route.ts`**: `ensureFreshPlenario()` no intervalo.
4. **`components/mobile/tabs/plenario/index.tsx`**: sinalize `real` vs `modelado` conforme a origem.

**Pronto quando**: plenário exibe dados reais da Câmara quando disponíveis, com fallback intacto, lint e build passam.

---

### T3 — Google Trends (buzz de busca)

**Objetivo**: trocar o componente `mencoes` do índice (`idx.sost`, hoje 100% modelado) por buzz real de busca.

**Faça**:
1. **Sidecar**: adicione `pytrends` ao `sidecar/sentiment/requirements.txt` e um endpoint `GET /trends?termo=...` em `app/py` retornando o interesse recente (série + valor atual normalizado ~100). Trate bloqueio de datacenter (pytrends às vezes 429) retornando vazio → fallback.
2. **`lib/sources/trends.ts`** (novo): `getTrendsReal(): number | null` (índice ~100), `ensureFreshTrends()`, cache `data/trends-cache.json`, TTL ~6h.
3. **`lib/live-mock.ts`** (`idxComponents`): `mencoes = getTrendsReal() ?? sintético`.
4. **`app/api/stream/route.ts`**: `ensureFreshTrends()` no intervalo.
5. **UI**: em `components/mobile/tabs/ticker/signal-cards.tsx` e `sost-idx-card.tsx`, troque a tag de `mencoes` de `modelado` para `real` **somente** quando `getTrendsReal()` retornou dado.

**Pronto quando**: card de menções mostra Trends real quando disponível (tag `real`), senão modelado, lint e build passam.

---

### T4 — Votos 2022 do Sóstenes (TSE)

**Objetivo**: gravar como **constante** os votos de 2022 do Sóstenes (total e por município RJ) e usar no comparativo da watchlist e na camada `v2022` do mapa.

**Faça**:
1. Crie a constante de dados (não é fetch ao vivo — é dado histórico fixo): `lib/data/votos-2022-sostenes.ts` (ou `data/votos-2022.json`) com `{ totalVotos, porMunicipio: { [municipio]: votos } }`, fonte TSE (resultados 2022 dep. federal RJ). Documente a fonte no topo do arquivo.
2. **`data/watchlist.json`**: adicione `votos2022` ao registro do **principal** (hoje só os concorrentes têm).
3. **`components/mobile/tabs/rio/mapa-rj.tsx`**: a camada `v2022` passa a usar `porMunicipio` real em vez do hash mock.
4. **`components/mobile/tabs/ticker/competitor-tape.tsx`**: use o `votos2022` real do principal na calibração do comparativo.

**Pronto quando**: mapa RJ e comparativo usam votos 2022 reais, lint e build passam.

---

### T5 — Tags "modelado" nas abas restantes

**Objetivo**: nenhum dado sintético aparece sem sinalização.

**Faça**: aplique o padrão visual `.m-signal-tag.mock` (texto `modelado`) / `.m-signal-tag.real` (já em `app/m/m.css`) onde ainda falta:
- `components/mobile/tabs/redes/index.tsx` (blocos não-YouTube)
- `components/mobile/tabs/pesquisas/index.tsx` (série própria sintética)
- `components/mobile/tabs/radar/index.tsx` (feeds mock)
- `components/mobile/tabs/voz/index.tsx` (mensagens mock)

Mantenha consistência com o uso já existente em `signal-cards.tsx`/`national-actors.tsx`. Não invente novo CSS se o existente serve.

**Pronto quando**: cada aba acima exibe a tag correta, lint e build passam.

---

### T6 — Atualizar `wow.md`

Para cada item entregue (T1–T4), **mova** a linha da tabela "🔜 O que falta" para "✅ Dados REAIS no ar", com a tecnologia/arquivo usados. Atualize a seção de Stack se adicionou `pytrends`. Mantenha o tom e o formato do documento.

---

## 4. Restrições (resumo)

- **Não** tocar no cockpit desktop nem em `senhas.md` / `data/*.jsonl`.
- **Não** adicionar dependência paga ou credencial. X/Instagram/TikTok permanecem **modelados** (decisão do wow.md — bloqueiam datacenter).
- **Não** quebrar schemas Zod: só estender com campos `.optional()`.
- Toda fonte real: cache em disco + fallback sintético + `try/catch` que nunca propaga.
- `npm run lint` e `npm run build` verdes ao fim de **cada** tarefa.
- Commits pequenos por tarefa (T1, T2, …) se for commitar.
