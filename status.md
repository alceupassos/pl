# Plano de Execução & Status do Sistema — Eleições 2026

> Última atualização: **2026-10-04T05:13:30-03:00**

---

## 📋 Plano de Ação e Progresso em Tempo Real

| Status | Etapa | Descrição | Arquivos Modificados / Criados |
| :---: | :--- | :--- | :--- |
| `[x]` | **1. Telão & Central Mobile** | Apuração ao vivo nacional e estadual (27 UFs) + Necessidade de Votos. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [tse-apuracao.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/tse-apuracao.ts) |
| `[x]` | **2. Casas Legislativas & Tags** | **Senado (54 vagas)**, **Câmara (513 vagas)** e **Assembleias (1059 vagas)** com tags `Eleito`, `Eleito por QP` e `Eleito por média`. | [tse-nacional.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/tse-nacional.ts), [tse-apuracao.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/tse-apuracao.ts) |
| `[x]` | **3. Fotos Oficiais TSE** | Script de download rodando/resume em `data/tse-fotos/`. | [baixar-fotos-tse.mjs](file:///Users/alceupassos/angra/sostenes/scripts/baixar-fotos-tse.mjs) |
| `[x]` | **4. Notícias & Links** | Abertura de matérias em nova aba (`target="_blank"`). | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx) |
| `[x]` | **5. Documentação de Vars** | Modelo `.env.example` com todas as chaves documentadas. | [.env.example](file:///Users/alceupassos/angra/sostenes/.env.example) |
| `[x]` | **6. Proteção de Credenciais** | Adicionado `senhas.md` e logs de acesso ao `.gitignore`. | [.gitignore](file:///Users/alceupassos/angra/sostenes/.gitignore) |
| `[x]` | **7. Desativar Login Provisoriamente** | Login desativado (`AUTH_DISABLED=true` em `.env.local` e `lib/auth.ts`). | [auth.ts](file:///Users/alceupassos/angra/sostenes/lib/auth.ts), [.env.local](file:///Users/alceupassos/angra/sostenes/.env.local) |
| `[x]` | **8. Ativação Diária do Candidato** | Formulário 1x/dia com Nome, Email, WhatsApp, Número, Cargo, UF e Território. | [candidato-push.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/candidato-push.ts), [route.ts](file:///Users/alceupassos/angra/sostenes/app/api/candidato/perfil/route.ts), [ativacao-candidato.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/ativacao-candidato.tsx) |
| `[x]` | **9. Push de Resultados ao Vivo** | Disparo de notificações WebPush + WhatsApp sempre que a apuração atualizar a posição. | [candidato-push.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/candidato-push.ts) |
| `[x]` | **10. Validação TypeScript** | Checagem compilada sem nenhum erro (`tsc --noEmit` exit code 0). | — |
| `[x]` | **11. Disclaimer de Tempo Real** | Aviso legal atualizado deixando claro que os dados não substituem fontes oficiais em tempo real (atualizado no VPS 169). | [legal-text.ts](file:///Users/alceupassos/angra/sostenes/lib/legal-text.ts) |
| `[x]` | **12. Mapa Visual SVG Interativo** | Trocar o seletor de estados (grid) por um Mapa do Brasil clicável (SVG) com efeito de relevo, exibição de candidatos no hover e sobreposição inicial na tela. | [brazil-map.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/brazil-map.tsx), [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx) |
| `[x]` | **13. Bloqueio Inicial em pl.angra.io** | Telão e mobile (/c) iniciam sobrepostos pelo Mapa e exigem login/ativação. Mobile redireciona automaticamente e também exige cadastro único e login. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [campaign-cockpit.tsx](file:///Users/alceupassos/angra/sostenes/components/campaign-cockpit.tsx) |
| `[x]` | **14. UX Premium de Login & Scroll Lateral** | Redesign do Glassmorphism no cadastro e modal de acesso. Adicionado `EdgeScroller` para arrasto de mouse nas bordas da tela. | [landing.css](file:///Users/alceupassos/angra/sostenes/app/landing.css), [globals.css](file:///Users/alceupassos/angra/sostenes/app/globals.css) |

---

## ⏸️ Como Continuar Após Atualizar a IDE

### 1. Continuar o Download das Fotos do TSE (pula as fotos já salvas):
```bash
node scripts/baixar-fotos-tse.mjs todas
```

### 2. Iniciar a Aplicação Localmente:
```bash
npm run dev
```
- **Central Mobile**: `http://localhost:3000/c`
- **Telão de Pleitos TV**: `http://localhost:3000/telao/pleitos`
