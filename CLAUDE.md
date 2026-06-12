# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`politica-cockpit` (repo also referred to as "pl" / "sostenes" / "angra") is a Next.js 16 App Router app combining two experiences on one site:

- **Public landing + login** rendered by `components/login-screen.tsx`, gated by an ALTCHA proof-of-work captcha.
- **Authenticated campaign cockpit** at `/` — a ~20-section operator dashboard for a Brazilian election campaign (dashboard, pesquisas, territórios, concorrentes, redes sociais, candidatos, CRM eleitoral, financeiro, compliance TSE, calculadora, downloads, etc.).

The cockpit currently renders **mockup data** (note the "MOCKUP" banner injected in `campaign-cockpit.tsx`). `design.md` describes the intended migration toward Supabase-backed real data and away from `dangerouslySetInnerHTML` — neither is done yet, so treat the HTML-string rendering below as the current reality, not the target.

## Commands

```bash
npm run dev              # next dev (Turbopack)
npm run build            # next build
npm run start            # next start (after build)
npm run lint             # eslint . (flat config, next/core-web-vitals + next/typescript)
npm run remotion:studio  # open Remotion studio for the campaign video
npm run remotion:render  # render remotion/index.ts CampaignWeeklyVideo -> out/campaign-weekly.mp4
```

There is **no test runner configured** and no test files, despite `@playwright/test` being a devDependency. Don't invent a `npm test`. Verify changes via `npm run lint` and `npm run build`.

Environment is Windows 11 + PowerShell 5.1 (`powershell.exe`, not `pwsh`): no `&&`/`||` chaining, UTF-16 default encoding, avoid `2>&1` on native exes. A Bash tool is also available.

## Architecture

### The cockpit is a hybrid HTML-string + React app — this is the most important thing to understand

`app/page.tsx` renders `<CampaignCockpit />` (`components/campaign-cockpit.tsx`), a single large client component. Most sections are **pre-built HTML strings**, not JSX:

- `components/campaign-data.ts` exports `campaignSections` (HTML markup per section id), `pageTitles`, and `candidateDetails`. This file is ~950 lines / ~77k tokens — read it with `offset`/`limit`, never whole.
- The active section's HTML is injected via `dangerouslySetInnerHTML`, then post-processed imperatively in `useEffect`:
  - **Icons**: Lucide is loaded from a CDN UMD `<Script>`; `window.lucide.createIcons()` hydrates `<i data-lucide="...">` placeholders. After any DOM change you must re-call it (the component already does this on a `setTimeout`).
  - **Charts**: `components/campaign-charts.ts` (`renderSectionCharts(sectionId)`) creates Chart.js instances by `getElementById`. Only sections listed in `refreshableSections` (`campaign-config.ts`) get charts re-rendered.
  - **Calculator**: the `calculadora` section is driven by raw DOM reads/writes in `syncCalculatorOutputs()` against hardcoded element ids (`inp_eleitores`, `res_coef`, …).
- **Exceptions** — two sections ARE real React components, switched on in the render: `candidato-detalhe` → `CandidateDetail`, `downloads` → `CampaignDownloads`.

Consequence: adding/editing a normal section means editing HTML strings in `campaign-data.ts` + (optionally) a chart config in `campaign-charts.ts` + registering the nav item in `campaign-config.ts`. The `refreshTick` state and `data-candidate-key` click delegation bridge the imperative DOM world back into React state.

Navigation structure lives in `components/campaign-config.ts` (`navigationGroups`). Section ids there must match keys in `campaignSections`/`pageTitles`.

### Auth: hand-rolled, no auth library

`lib/auth.ts` implements HS256 JWTs by hand (`createHmac`, `timingSafeEqual`) stored in an httpOnly cookie. Flow lives in `app/api/auth/{login,logout,session}/route.ts`. Two credential classes:

1. **Main** — `AUTH_LOGIN` / `AUTH_PASSWORD` env vars.
2. **Provisional** — parsed at runtime from the markdown table in `senhas.md` (`lib/provisional-passwords.ts`), each with an expiry and a max-IP count. IP bindings persist to `data/provisional-credential-ip-bindings.json`; once a login's IP slots fill, other IPs are rejected (`ip_mismatch`).

Every login is gated by an **ALTCHA** proof-of-work solution (`verifyAltchaPayload`), with challenge/verify endpoints under `app/api/altcha/`.

All auth secrets have **insecure dev defaults** in `lib/auth.ts` — set real values in production: `AUTH_LOGIN`, `AUTH_PASSWORD`, `AUTH_COOKIE_NAME`, `AUTH_JWT_SECRET`, `ALTCHA_HMAC_SECRET`.

### Persistence is flat files on the local filesystem, not a database

`lib/access-log.ts` is the I/O hub. It appends JSONL and reads it back:

- `data/access-log.jsonl` — every login attempt and cockpit section view, enriched with geolocation from `ipapi.co` (cached 24h; private IPs skipped).
- `data/transparency-leads.jsonl` — landing-page leads.

Admin/reporting pages read these server-side: `/log` (access log), `/cadastrados` (leads), `/mapa` (`components/access-map.tsx`, plots IPs on `public/brazil-map.svg` using `CITY_POSITIONS`/`STATE_POSITIONS` in `app/mapa/page.tsx`).

Because state is files under `process.cwd()`, this app assumes a **writable, persistent filesystem** — it will not behave correctly on a read-only/ephemeral serverless deploy.

### Lead capture has a dual sink

`app/api/transparency-lead/route.ts` posts each lead to `formsubmit.co` (email to `eleicao@angra.io`) AND, if `SUPABASE_URL`+`SUPABASE_SERVICE_ROLE_KEY` are set, inserts to Supabase. Supabase is otherwise unused; it's optional.

### Remotion

`remotion/` renders a vertical (1080×1920) weekly campaign recap video. Composition `CampaignWeeklyVideo` is registered in `remotion/Root.tsx`; `@remotion/renderer` is marked `serverExternalPackages` in `next.config.ts`.

## Conventions

- **Path alias**: `@/*` maps to the repo root (`tsconfig.json`), e.g. `@/lib/auth`, `@/components/campaign-data`.
- TypeScript `strict` is on. `next.config.ts` sets `images.unoptimized` (so `<img>` with eslint-disable is used for cockpit logos) and `reactStrictMode`.
- UI primitives in `components/ui/` follow shadcn conventions (`components.json`, `cva`, `tailwind-merge` via `lib/utils.ts`'s `cn`).
- Tailwind v4 via `@tailwindcss/postcss`; global styles split across `app/globals.css` (cockpit theme) and `app/landing.css`.
- All user-facing copy is Brazilian Portuguese (`lang="pt-BR"`).
- The empty `CLAUDE.md` files inside `app/`, `components/`, `lib/`, etc. are auto-generated `claude-mem` stubs — ignore them, don't treat them as docs.

## Sensitive files

`senhas.md` (provisional credentials), `data/*.jsonl`, and `data/provisional-credential-ip-bindings.json` contain real-ish login and visitor data and are committed to the repo. Don't paste their contents into commits, PRs, or external services.

## Deploy

Production runs on a **self-managed VPS** (Ubuntu, host `vmi3199324`, persistent writable filesystem — required, see file-based persistence above). Connect:

```bash
ssh root@62.171.181.241      # root password provided out-of-band; NOT stored in repo
```

The box runs **PM2** with several unrelated apps — `sostenes`, `camara-angra`, `agente`, `gama`, `pesquisa`, `capataz`, `strategy`, `whatsgate`. **This project is the PM2 app `candidato`** (do not touch the others).

- **App dir**: `/opt/candidato`
- **Tracks**: `origin` = `github.com/alceupassos/pl`, branch `candidato-deploy`
- **Deploy** (no dependency changes → skip install; otherwise add `npm ci`):

  ```bash
  cd /opt/candidato
  git pull --ff-only origin candidato-deploy
  npm run build                 # prebuild bumps v4.x; data/build-counter.json (gitignored) persists here
  pm2 restart candidato --update-env
  ```

- `data/access-log.jsonl` is **mutated at runtime** on the server (shows as locally modified). It isn't touched by app-code commits, so a fast-forward pull preserves the server's live copy — never overwrite it with the repo's older version.
- The version stamp (`v4.x`) shows in the `/m` header for cache diagnosis on the device — see `scripts/bump-version.mjs` + `next.config.ts`.
