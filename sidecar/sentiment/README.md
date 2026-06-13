# Sidecar de sentimento (PT) — pysentimiento

Serviço HTTP local que pontua textos em português (pos/neg/neu) com o modelo
`pysentimiento` (BERTabaporu). Consumido pelo app Node em `lib/sources/sentiment.ts`
para alimentar `idx.sost.breakdown.sentimento`.

Também expõe endpoints de **redes sociais** (seguidores, vídeos) com gateways
Bright Data → Kondado → fallback nativo por rede.

- Bind: `127.0.0.1:8088` (nunca exposto à internet).
- RAM: ~1 GB (modelo carregado no boot). CPU-only.

## Setup no VPS (uma vez)

```bash
cd /opt/candidato/sidecar/sentiment
python3 -m venv .venv
# torch CPU primeiro (evita baixar wheels CUDA gigantes)
.venv/bin/pip install --upgrade pip
.venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install -r requirements.txt
# primeira execução baixa o modelo (~500 MB) para ~/.cache/huggingface
pm2 start .venv/bin/uvicorn --name sentiment --interpreter none -- app:app --host 127.0.0.1 --port 8088
pm2 save
```

## Teste

```bash
curl -s 127.0.0.1:8088/health
curl -s -X POST 127.0.0.1:8088/sentiment -H 'content-type: application/json' \
  -d '{"textos":["Sóstenes faz excelente trabalho","Sóstenes foi criticado duramente"]}'
```

`.venv/` e o cache do modelo NÃO vão para o git (ver `.gitignore`).

## Redes sociais — variáveis de ambiente

Configure no PM2 do processo `sentiment` (nunca commitar tokens):

```bash
# Bright Data (prioridade 1 — perfis por dataset)
BRIGHTDATA_TOKEN=...
BRIGHTDATA_INSTAGRAM_PROFILES_DATASET_ID=gd_l1vikfch901nx3by4
BRIGHTDATA_FACEBOOK_PROFILES_DATASET_ID=...
BRIGHTDATA_X_PROFILES_DATASET_ID=...
BRIGHTDATA_TIKTOK_PROFILES_DATASET_ID=...
BRIGHTDATA_LINKEDIN_PROFILES_DATASET_ID=...
BRIGHTDATA_TIMEOUT_MS=60000

# Kondado (prioridade 2 — JSON pré-coletado)
KONDADO_API_KEY=...
KONDADO_API_TOKEN=...
KONDADO_INSTAGRAM_JSON_URL=...
KONDADO_FACEBOOK_JSON_URL=...
KONDADO_X_JSON_URL=...
KONDADO_TIKTOK_JSON_URL=...
KONDADO_LINKEDIN_JSON_URL=...

# Fallbacks nativos (prioridade 3)
META_ACCESS_TOKEN=...          # token de longa duração (60 dias)
META_IG_USER_ID=...            # ID numérico da conta IG Business vinculada à página
META_IG_USERNAME=sostenescavalcante
META_FB_PAGE_ID=...            # ID numérico da página Facebook do candidato
X_COOKIES='{"auth_token":"...","ct0":"..."}'

# Proxy outbound (VPS datacenter → api.brightdata.com / URLs Kondado)
# Opção A — URL única para ambos:
SOCIAL_OUTBOUND_PROXY=http://user:pass@proxy.example.com:8080

# Opção B — separado por gateway:
# BRIGHTDATA_OUTBOUND_PROXY=http://...
# KONDADO_OUTBOUND_PROXY=http://...

# Opção C — superproxy Bright Data (brd.superproxy.io):
# BRIGHTDATA_PROXY_CUSTOMER_ID=...
# BRIGHTDATA_PROXY_ZONE=residential
# BRIGHTDATA_PROXY_ZONE_PASSWORD=...
# BRIGHTDATA_PROXY_HOST=brd.superproxy.io
# BRIGHTDATA_PROXY_PORT=33335
# BRIGHTDATA_PROXY_CA_CERT=/path/to/brightdata-ca.crt

# Fallback padrão do sistema (requests também lê HTTP_PROXY / HTTPS_PROXY)
# HTTPS_PROXY=http://user:pass@host:port
```

Chamadas à **Bright Data API** e aos **endpoints JSON da Kondado** passam pelo proxy quando configurado. Fallbacks nativos (Meta Graph, X cookies, yt-dlp) continuam diretos.

LinkedIn **não** tem fallback nativo — só Bright Data ou Kondado.

### Endpoints de perfis

| Rede | Single | Batch |
|------|--------|-------|
| Instagram | `GET /instagram?handle=username` | `GET /instagram/profiles?handles=a,b,c` |
| Facebook | `GET /facebook` (página principal) | `GET /facebook/profiles?handles=a,b,c` |
| X | `GET /x?handle=username` | `GET /x/profiles?handles=a,b,c` |
| TikTok | `GET /tiktok?handle=username` | `GET /tiktok/profiles?handles=a,b,c` |
| LinkedIn | `GET /linkedin?handle=username` | `GET /linkedin/profiles?handles=a,b,c` |

Sem credenciais os endpoints retornam `null` e o app mantém o fallback modelado.

## YouTube e TikTok vídeos (yt-dlp — sem credencial)

- `GET /youtube?channel=...`
- `GET /youtube/videos?channel=...&n=10`
- `GET /tiktok/videos?handle=username&n=10`

TikTok pode bloquear IP de datacenter; nesse caso o app mantém o fallback modelado.

## Cache no app Node (Postgres-first)

O Next.js persiste seguidores em `social_profile_cache` (Postgres via `DATABASE_URL`)
com fallback `data/social-profile-cache.json`. TTL padrão: 12 h (`SOCIAL_CACHE_TTL_HOURS`).
Stale usável até 168 h (`SOCIAL_CACHE_STALE_HOURS`) para não gastar créditos Bright Data
a cada tick do SSE.
