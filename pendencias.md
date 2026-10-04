# Pendências — o que falta para o sistema ficar pronto

> Levantamento gerado em **2026-06-18**. Documento de trabalho: marque os itens conforme
> forem concluídos. Referência cruzada com [`CLAUDE.md`](CLAUDE.md), [`wow.md`](wow.md),
> [`progresso.md`](progresso.md) e [`execute.md`](execute.md).
>
> Legenda de prioridade: 🔴 bloqueador de produção · 🟠 operacional (campanha depende) ·
> 🟡 melhoria de qualidade de dado · ⚪ higiene / nice-to-have.

---

## 1. Segurança & produção 🔴

O maior risco hoje não é falta de feature — é o sistema estar **aberto** e com **segredos de dev**.

- [ ] **Login está DESLIGADO provisoriamente.** `lib/auth.ts` trata todo acesso como
  autenticado quando `AUTH_DISABLED=true` (`verifySession` devolve sessão sintética
  `auth-disabled`). Decidir se reativa o login antes de expor o domínio publicamente; se
  reativar, remover `AUTH_DISABLED` do `.env` do servidor.
- [ ] **ALTCHA com bypass** (`DISABLE_ALTCHA=true` / `NEXT_PUBLIC_DISABLE_ALTCHA` no
  `.env.local`). Os próprios warnings no código dizem "REMOVER ANTES DE PRODUÇÃO".
- [ ] **Segredos com defaults inseguros de dev.** `AUTH_LOGIN`, `AUTH_PASSWORD`,
  `AUTH_COOKIE_NAME`, `ALTCHA_HMAC_SECRET`, `AUTH_JWT_SECRET` não estão no `.env` local →
  caem no fallback `*-change-me`. Confirmar que estão definidos no `.env` do VPS com valores
  reais (não versionar).
- [ ] **Arquivos sensíveis versionados.** `senhas.md` (credenciais provisórias, 33 KB),
  `data/*.jsonl` (log de acesso + leads com geolocalização) e
  `data/provisional-credential-ip-bindings.json` estão no repositório. Avaliar mover para
  fora do git / `.gitignore` + rotacionar o que vazou.
- [ ] **Criar `.env.example`** documentando todas as variáveis (sem valores) — hoje não
  existe; quem subir o app em outra máquina não sabe o que configurar.

---

## 2. WhatsApp, cobrança por IA e conversa 2 vias 🟠

Quase pronto — falta plugar a operação. (Ver bloco "Rede de Campanha" no `CLAUDE.md`.)

- [ ] **`COBRANCA_CRON_TOKEN` não definido.** `app/api/cobranca/run` retorna `401` sem ele.
  Definir no `.env` do servidor.
- [ ] **Cron da cobrança não agendado.** Criar cron chamando
  `/api/cobranca/run?token=<COBRANCA_CRON_TOKEN>` (cobra quem está <100% da meta, anti-spam
  de ~6 dias). Sem isso a cobrança automática nunca dispara.
- [ ] **Webhook de ENTRADA não registrado no whatsgate.** Registrar
  `https://candidato.angra.io/api/whatsapp/inbound?token=<token>` na sessão `51742fb1` para
  a conversa de 2 vias funcionar. Sem isso as respostas dos eleitores/cabos não chegam.
- [ ] **Bug do OTP `sent:true`** pendente (memória OTP-WhatsApp): cadastro com OTP via
  whatsgate precisa de validação fim-a-fim.
- [ ] **Sessões `alceu` / `alexandre`** do whatsgate ficam `qr_ready`/`disconnected` —
  reparear por QR se forem usadas (a sessão principal `5511916870066` está `ready`).
- [ ] **Variáveis whatsgate no `.env` local** só têm `WHATSGATE_API_KEY`; faltam
  `WHATSGATE_BASE_URL` e `WHATSGATE_SESSION_ID` (existem no servidor — confirmar).

---

## 3. Dados reais ainda modelados no cockpit `/m` 🟡

Tudo cai em fallback sintético com tag "modelado" (o app nunca quebra), mas estes ainda
**não são reais**. Fonte: `wow.md` → "O que falta".

- [ ] **TikTok** (seguidores/engajamento) — bloqueio de datacenter; sem scraper estável.
- [ ] **Engajamento IG / X / Facebook** (além da contagem de seguidores) — só seguidores
  ficam reais quando as credenciais estão configuradas.
- [ ] **Facebook — páginas de concorrentes** — Graph API não expõe sem app review.
- [ ] **Radar / Voz / Pesquisa própria** — dependem de CRM / WhatsApp / dados de campo;
  modelados até a integração.
- [ ] **Credenciais de redes sociais reais** ausentes no `.env`: `META_ACCESS_TOKEN` (+ IDs)
  para IG/FB, `X_COOKIES` para o X. Sem elas, IG/FB/X seguem modelados.
- [ ] **Google Trends e YouTube-por-vídeo bloqueados no VPS** (anti-bot de datacenter) →
  caem no sintético no servidor (funcionam em dev). Avaliar proxy se quiser real em prod.
- [ ] **Votos 2022 por município** — só ~20 municípios reais do TSE; os 92 do geojson do RJ
  usam fallback proporcional (`lib/data/votos-2022-sostenes.ts`). Completar se quiser mapa
  100% real.
- [ ] **Sidecar Python em produção** — confirmar `SENTIMENT_URL` e que o PM2 `sentiment`
  está no ar (pysentimiento, yt-dlp, pandas, pytrends).

---

## 4. Cockpit eleitoral `/w` — Fase 2 (dados reais) 🟡

Hoje **100% mock determinístico** (`lib/w/w-mock.ts`); todas as abas mostram badge DEMO.
Plano em `execute.md` → "Fase 2 — Dados reais (pós-MVP)".

- [ ] **`lib/w/tse-pesquisas.ts`** — baixar `pesquisa_eleitoral_2026.zip` do TSE (CDN),
  parse CSV Latin-1 (`iconv-lite` + `csv-parse`), cache `data/w-pesquisas.json` TTL 24h.
- [ ] **`lib/w/aggregator.ts`** — média móvel 30d ponderada (n amostral × decaimento por
  recência) + Monte Carlo 1.000 simulações → P(Top-2), P(Vencer), IC 95%.
- [ ] **`lib/w/tse-resultados.ts`** — apuração ao vivo: polling dos JSON de
  `resultados.tse.jus.br` a cada ~30s nos dias **04/10/2026** e **25/10/2026**, com cache e
  fallback. (Specs finais do TSE saem na audiência pública de julho/2026.)
- [ ] **Candidatos reais** — trocar lista hardcoded por `consulta_cand_2026_BRASIL.csv`
  (candidaturas deferidas).
- [ ] **Rotas API** `app/api/w/pesquisas` etc. e troca dos getters mock pelas fontes reais
  nas abas mercados/pesquisas/candidatos/apuração/histórico.

---

## 5. Persistência & escalabilidade 🟠

- [ ] **Downloads de materiais só na sessão do browser.** A biblioteca de materiais
  (`components/campaign-downloads.tsx`) guarda arquivos só localmente — não é compartilhada
  nem persistente entre usuários. Para ser acervo de equipe, precisa de storage em backend.
- [ ] **Estado em arquivos no FS** (`data/*.jsonl`, watchlist, IP bindings) assume
  filesystem persistente e gravável — **não funciona em serverless/efêmero**. Manter no VPS
  ou migrar para banco se for para Vercel/serverless.
- [ ] **Supabase opcional não configurado** (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) —
  leads vão só por e-mail (formsubmit.co) enquanto ausente.
- [ ] **`DATABASE_URL` (Postgres) ausente** — `lib/sources/social-cache.ts` tem suporte a
  cache em Postgres mas roda só em memória/arquivo sem ele.

---

## 6. Qualidade, testes e CI ⚪

- [ ] **Nenhum teste automatizado.** `@playwright/test` é devDependency mas não há testes
  nem `npm test`. Hoje a verificação é só `npm run lint` + `npm run build` + scripts
  manuais em `scripts/validate-*.mjs`.
- [ ] **Sem pipeline de CI** — deploy é manual por SSH/PM2. Avaliar GitHub Actions p/ lint +
  build a cada push em `candidato-deploy`.
- [ ] **Smoke visual `/m`** (login + abas no browser) continua marcado como manual no
  `progresso.md`.

---

## 7. Higiene do repositório ⚪

Arquivos não commitados/soltos na raiz (do `git status`):

- [ ] `cockpit-eleicoes-2026.html` (830 linhas) e variantes `*.html` na raiz/`public/` —
  decidir se é protótipo descartável ou se vira página integrada; hoje está solto.
- [ ] Imagens soltas na raiz: `main.jpeg`, `tela1.jpeg`, `tela2.jpeg`, `tela3.jpeg` — mover
  para `public/` ou `docs/`, ou remover.
- [ ] `osostenes.md` (pesquisa técnica) e demais `.md` de planejamento — consolidar/arquivar
  em `docs/` para não poluir a raiz.
- [ ] `tsconfig.tsbuildinfo` aparece como modificado — deveria estar no `.gitignore`.

---

## 8. Variáveis de ambiente a definir em produção (checklist)

Confirmar no `.env` do VPS (`/opt/candidato`). **Não versionar valores.**

| Área | Variáveis | Estado local |
|------|-----------|--------------|
| Auth | `AUTH_LOGIN`, `AUTH_PASSWORD`, `AUTH_COOKIE_NAME`, `AUTH_JWT_SECRET`, `ALTCHA_HMAC_SECRET` | ❌ usando defaults de dev |
| Auth (flags) | `AUTH_DISABLED`, `DISABLE_ALTCHA` | ⚠️ bypass ligado — remover em prod |
| Cobrança | `COBRANCA_CRON_TOKEN` | ❌ ausente (bloqueia cron) |
| WhatsApp | `WHATSGATE_BASE_URL`, `WHATSGATE_SESSION_ID`, `WHATSGATE_WEBHOOK_TOKEN` | ⚠️ só `WHATSGATE_API_KEY` local |
| Redes reais | `META_ACCESS_TOKEN` (+IDs), `X_COOKIES` | ❌ ausente → IG/FB/X modelados |
| Sidecar | `SENTIMENT_URL` | ⚠️ default `127.0.0.1:8088` |
| Push web | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ❌ ausente |
| Leads/DB | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | ❌ ausente (opcional) |
| vCard | `CAMPANHA_WHATSAPP`, `CAMPANHA_NOME` | ❌ ausente |
| Notificação | `ACCESS_WHATSAPP_TO` | ❌ ausente |
| IA | `AI_PROVIDER`, `GROK_API_KEY`/`XAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | ✅ presentes |

---

## Resumo executivo — o caminho mais curto até "pronto"

1. **Fechar segurança** (seção 1): reativar/decidir login, remover bypasses, segredos reais,
   tirar arquivos sensíveis do git. → sem isso não pode ir a público.
2. **Plugar a operação WhatsApp** (seção 2): token + cron + webhook. → ativa cobrança por IA
   e conversa de 2 vias, que já estão codadas.
3. **Subir dados reais por valor** (seções 3–4): priorizar pesquisas reais do TSE no `/w`
   (agregador) e as redes sociais reais no `/m`.
4. **Resto** (5–7): persistência de materiais, testes/CI e higiene do repo — incrementais.

_Status de `npm run build`: ✅ passou (exit 0, verificado em 2026-06-18). Falta cobertura de
testes automatizados — ver seção 6._
