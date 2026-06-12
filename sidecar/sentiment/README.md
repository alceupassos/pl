# Sidecar de sentimento (PT) — pysentimiento

Serviço HTTP local que pontua textos em português (pos/neg/neu) com o modelo
`pysentimiento` (BERTabaporu). Consumido pelo app Node em `lib/sources/sentiment.ts`
para alimentar `idx.sost.breakdown.sentimento`.

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

## Redes sociais (IG / FB / X) — variáveis de ambiente

Configure no PM2 do processo `sentiment` (nunca commitar tokens):

```bash
# Instagram + Facebook (Graph API — gratuito)
META_ACCESS_TOKEN=...          # token de longa duração (60 dias)
META_IG_USER_ID=...            # ID numérico da conta IG Business vinculada à página
META_IG_USERNAME=sostenescavalcante
META_FB_PAGE_ID=...          # ID numérico da página Facebook do candidato

# X (twifork + cookies de conta operacional dedicada)
X_COOKIES='{"auth_token":"...","ct0":"..."}'
```

Endpoints novos:

- `GET /instagram?handle=username`
- `GET /instagram/profiles?handles=a,b,c`
- `GET /facebook`
- `GET /x?handle=username`
- `GET /x/profiles?handles=a,b,c`

Sem essas variáveis os endpoints retornam `null` e o app mantém o fallback modelado.

## TikTok e YouTube (yt-dlp — sem credencial)

- `GET /youtube?channel=...`
- `GET /youtube/videos?channel=...&n=10`
- `GET /tiktok?handle=username`
- `GET /tiktok/profiles?handles=a,b,c`
- `GET /tiktok/videos?handle=username&n=10`

TikTok pode bloquear IP de datacenter; nesse caso o app mantém o fallback modelado.
