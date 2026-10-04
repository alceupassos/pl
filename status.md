# 🏛️ Plano de Execução & Status do Sistema — Eleições 2026

> Última atualização: **2026-10-04T08:45:00-03:00** — Executado no **Claude Opus 5.5**
> 
> **Status Geral**: 🟢 **Sistema 100% Operacional em Produção** (`https://pl.angra.io` e `https://politica.angra.io`).

---

## 📋 Resumo Executivo das 28 Etapas Implementadas

| Status | Etapa | Descrição | Principais Arquivos |
| :---: | :--- | :--- | :--- |
| `[x]` | **1. Telão & Central Mobile** | Apuração ao vivo nacional e estadual (27 UFs) + Cálculo da Necessidade de Votos. | `components/telao/pleitos-wall.tsx`, `lib/telao/tse-apuracao.ts` |
| `[x]` | **2. Casas Legislativas & Tags** | **Senado (54 vagas)**, **Câmara (513 vagas)** e **Assembleias (1059 vagas)** com tags oficiais `Eleito`, `Eleito por QP` e `Eleito por média`. | `lib/telao/tse-nacional.ts`, `lib/telao/tse-apuracao.ts` |
| `[x]` | **3. Fotos Oficiais TSE** | Proxy inteligente `/api/telao/foto/[eleicao]/[uf]/[sq]` com cache em disco e script resiliente de download. | `scripts/baixar-fotos-tse.mjs`, `app/api/telao/foto/` |
| `[x]` | **4. Notícias & Links** | Abertura de matérias em nova aba com segurança (`target="_blank"` e `rel="noreferrer"`). | `components/telao/pleitos-wall.tsx` |
| `[x]` | **5. Documentação de Vars** | Modelo `.env.example` completo com todas as variáveis documentadas. | `.env.example` |
| `[x]` | **6. Proteção de Credenciais** | Sanitização do repositório, exclusão de senhas e logs adicionados ao `.gitignore`. | `.gitignore` |
| `[x]` | **7. Desativar Login Provisoriamente** | Acesso direto ao cockpit sem barreira de login para testes e dia da eleição. | `lib/auth.ts`, `.env.local` |
| `[x]` | **8. Ativação Diária do Candidato** | Modal de onboarding do candidato com armazenamento de perfil e território. | `components/telao/ativacao-candidato.tsx`, `app/api/candidato/` |
| `[x]` | **9. Push de Resultados ao Vivo** | Disparo de notificações WebPush e integração para alertas em tempo real. | `lib/telao/candidato-push.ts` |
| `[x]` | **10. Validação TypeScript** | Rigorosa compilação estática (`tsc --noEmit`) sem nenhum erro de tipagem. | `tsconfig.json` |
| `[x]` | **11. Disclaimer Legal & Resoluções TSE** | Adequação às Resoluções TSE nº 23.610/2019 e 23.755/2026 (rotulagem de IA e uso estritamente partidário). | `lib/legal-text.ts`, `components/telao/pleitos-wall.tsx` |
| `[x]` | **12. Mapa Interativo do Brasil** | Mapa SVG colorido por macrorregiões com hover luminoso idêntico ao estado selecionado. | `components/telao/brazil-map.tsx` |
| `[x]` | **13. Domínio Espelho politica.angra.io** | Nginx configurado com SSL Let's Encrypt para `politica.angra.io` na porta 3080. | `/etc/nginx/sites-available/politica.angra.io` |
| `[x]` | **14. Menu de Partidos & Cores Oficiais** | Cores autênticas para cada legenda partidária (`COR_PARTIDO`) refletidas nos cards e cabeçalho. | `components/telao/pleitos-wall.tsx`, `app/telao/pleitos/pleitos.css` |
| `[x]` | **15. Mini Mapa de Andamento por Cargo** | Painel interativo com seletor de cargo (Presidente, Gov, Senador, Dep Fed, Dep Est) e calor por % de apuração. | `components/telao/mini-mapa-pleito.tsx` |
| `[x]` | **16. Deploy Automatizado na VPS** | Deploy contínuo via SSH no servidor `169.58.71.28` (`/opt/pl`) com PM2 reload. | Processo PM2 `pl` |
| `[x]` | **17. Scroll Vertical Livre & Busca** | Removidos limites de visualização com suporte a navegação por teclado (setas) e mouse. | `components/telao/pleitos-wall.tsx`, `app/telao/pleitos/pleitos.css` |
| `[x]` | **18. Redesign do Mini Mapa & Mobile** | Layout glassmorphism responsivo com abas por macrorregião e proteção contra sobreposição. | `components/telao/mini-mapa-pleito.tsx` |
| `[x]` | **19. Alinhamento de Slots & Ticker RSS** | Altura fixa uniforme de 3.1rem para % na vitrine e correção de encoding ISO-8859-1 (mojibake). | `lib/telao/noticias.ts`, `app/telao/pleitos/pleitos.css` |
| `[x]` | **20. Ocultação de Bens & Barra Destaque** | Removida barra '★ EM DESTAQUE', ocultada exibição de bens (`R$ ... mi`) e municípios autônomos. | `components/telao/pleitos-wall.tsx`, `app/telao/pleitos/pleitos.css` |
| `[x]` | **21. Fim do Modo Claro & Degradê de Barrinhas** | Eliminado 100% de qualquer flash claro (FOUC). Background escuro global com degradê de barrinhas verticais claras e remoção do logo/foto de Sóstenes em prol de marca neutra institucional. | `app/layout.tsx`, `app/globals.css`, `app/design-refresh.css`, `app/telao/pleitos/refresh.css` |
| `[x]` | **22. Exibição de 100% dos Candidatos & Cards Compactos** | Removido limite de 30 candidatos: base oficial completa do TSE carregada (1.045 dep. federais SP, 1.346 dep. estaduais SP e todos das 27 UFs). Cards ultracompactos de alta densidade para deputados e scroll vertical contínuo na apuração proporcional com busca instantânea. | `lib/telao/pleitos-sp.json`, `components/telao/pleitos-wall.tsx`, `app/telao/pleitos/pleitos.css` |
| `[x]` | **23. Tema Claro "Wood" (padrão) + Toggle Escuro** | Paleta madeira clara (bordo/carvalho, tinta nogueira, acento mel), mini faixas verticais em degradê (veio) e piso 3D de ripas em perspectiva. Botão sol/lua no cabeçalho, escolha salva por aparelho; script anti-flash aplica o tema antes da pintura. Cockpit `/`, `/m` e `/w` seguem escuros. | `app/telao/pleitos/wood.css`, `app/telao/pleitos/page.tsx`, `app/c/page.tsx`, `app/layout.tsx` |
| `[x]` | **24. Cards em Vidro 3D com Relevo** | Cards de candidato em vidro (bisel claro no topo, sombra embaixo, brilho especular), inclinação 3D no hover; blur real só onde há poucos cards (deputados sem blur, para não travar com 1.000+). Nos dois temas. | `app/telao/pleitos/wood.css` |
| `[x]` | **25. Zoom do Candidato (números + colocação)** | Clique/Enter em qualquer card (vitrine, ranking, líder, deputados, bolinhas da Corrida) abre zoom FLIP: foto grande, colocação "3º de 12", % e votos, distância para o de cima/de baixo/líder, 50%+1, vagas, posição dentro do partido (deputados), urnas apuradas. Pré-17h: posição e empate técnico pela pesquisa. Esc/clique fora fecha; no `/c` vira bottom sheet com arrastar para baixo. Carrossel pausa enquanto aberto. | `components/telao/pleitos-wall.tsx` (`CandidatoZoom`, `alvoApurado`, `alvoVitrine`) |
| `[x]` | **26. Barras e Fotos em Todos os Candidatos** | "Ripas" 3D (barras extrudadas com mini faixas na cor do partido) nos cards da vitrine, no ranking majoritário e nos cards de deputado; pódio da pesquisa com colunas 3D e foto no topo de cada barra. Removido o selo "Deferido/Indeferido" dos cards. | `components/telao/pleitos-wall.tsx`, `app/telao/pleitos/wood.css` |
| `[x]` | **27. Filtros A–Z e por Partido (Deputados)** | Dep. Federal e Estadual (vitrine e apuração): botões pequenos A–Z no topo (letras sem candidato ficam desabilitadas) e filtro por partido com contagem no rodapé, ambos fixos nas bordas da lista; busca por nome/número/partido. | `components/telao/pleitos-wall.tsx` (`FiltroLetras`, `FiltroPartidosMini`) |
| `[x]` | **28. Registro no Lugar do Login + Selos de Partido** | Telão e `/c` não pedem mais login: cadastro com nome + WhatsApp (sem senha) e escolha dos partidos por botões com selo (medalhão na cor da legenda com o número na urna, derivado dos próprios números dos candidatos). Cookie próprio `telao_reg` (30 dias) que libera SÓ o telão (o cockpit continua exigindo login). Registros em `data/telao-registros.jsonl` (gitignored). | `lib/telao/registro.ts`, `app/api/telao/registro/route.ts`, `components/telao/pleitos-wall.tsx` (`RegistroTelao`, `SeloPartido`) |

---

## 🚀 Detalhamento de Tudo o que Foi Realizado

### 1. Base Oficial de 100% dos Candidatos (Sem Limite de 30)
- **Problema anterior**: O arquivo estático `pleitos-sp.json` possuía apenas 30 deputados federais e 30 estaduais fatiados.
- **Ação realizada**:
  - Script automático conectado à API oficial do TSE (`resultados.tse.jus.br`) para baixar e estruturar **todos os candidatos oficiais**:
    - **Presidente da República**: 12 candidatos
    - **Governador (SP)**: 5 candidatos
    - **Senador (SP)**: 13 candidatos
    - **Deputado Federal (SP)**: 1.045 candidatos
    - **Deputado Estadual (SP)**: 1.346 candidatos
    - **Total só em SP**: 2.421 candidatos
  - Para as demais UFs (`/api/telao/candidatos?uf=...`), a API continua consultando o TSE em tempo real para retornar a totalidade dos candidatos registrados.
  - Eliminados todos os limites em código (`MAJORITARIO_MAX = 20` e `PROPORCIONAL_MAX = 20`).

### 2. Cards Ultracompactos de Alta Densidade para Deputados
- Como as eleições proporcionais possuem centenas ou milhares de concorrentes, o card padrão ocupava muito espaço na tela.
- **Novo Design Compacto**:
  - **Grid de alta densidade**: `repeat(auto-fill, minmax(88px, 1fr))` com gap reduzido para `0.35rem`.
  - **Fotos otimizadas**: Reduzidas de 4.2em/5.4em para `2.5em` com cantos suaves (`border-radius: 6px`).
  - **Microtipografia**: Nome em 2 linhas com corte elíptico suave, partido e número em badges nítidos de alta visibilidade.
  - **Slot de Pesquisa / Votos**: Compactado para `2.1rem` para manter 100% dos cards simétricos e alinhados.
  - **Modo Proporcional (Apuração ao Vivo)**: Grid de deputados agora possui scroll vertical independente e campo de busca instantânea (`Buscar deputado...`), permitindo localizar qualquer candidato pelo nome, número ou legenda.

### 3. Eliminação Total do Flash Claro (FOUC)
- A landing page e os modais continham propriedades com `--nx-bg: #f5f4ee` e `color: #152e42` que causavam um clarão antes da inicialização do cockpit ou fechamento de modais.
- Inserido CSS inline imediato no `<head>` de `app/layout.tsx` forçando `background-color: #070a12 !important; color-scheme: dark !important;`.
- Todas as classes de login e landing foram unificadas no tema escuro aeroespacial.
- O modal de boas-vindas do telão foi configurado com `mapaAberto = false`, abrindo direto na tela de apuração e mantendo o modal escuro caso o usuário clique para trocar de estado.

### 4. Textura de Degradê de Barrinhas Verticais Claras
- Implementada a identidade visual de cockpit de centro de inteligência e sala de comando:
  ```css
  background-color: #070a12;
  background-image:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 40%, rgba(2, 6, 23, 0.6) 100%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.035) 0px, rgba(255, 255, 255, 0.035) 2px, transparent 2px, transparent 32px),
    radial-gradient(ellipse 100% 70% at 50% -10%, rgba(56, 189, 248, 0.12), transparent 70%);
  background-attachment: fixed;
  ```
- Barrinhas verticais nítidas com espaçamento calibrado e iluminação clara projetada do topo para a base.

### 5. Remoção do Logo de Sóstenes & Identidade Institucional
- Eliminadas imagens personalizadas e substituídas pelo selo institucional neutro:
  - **POLÍTICA · SALA DE COMANDO · 2026** com indicador tricolor verde, amarelo e azul.

---

## 📌 O que Tem para Fazer (Próximos Passos e Operação)

### 0. Feito nesta rodada (04/10, manhã)
- Correções extras: cores de legenda `SOLIDARIEDADE` e `PCDOB` (as chaves antigas `SD` / `PC do B` não batiam com os dados do TSE); 2 erros antigos de lint (setState em effect em `Foto` e `FiltroLocal`) corrigidos; aviso de hidratação do `<html>` suprimido para o tema.
- Testado com Playwright em 1920×1080 e 390×844 com apuração simulada (63% das urnas): cadastro, vitrine/pódio, ranking, deputados com filtros, zoom, temas wood/escuro. `tsc`, `eslint` (0 erros) e `npm run build` OK.
- **Para ver os registros do telão:** `data/telao-registros.jsonl` no servidor (nome, WhatsApp, partidos, IP).

### 1. Monitoramento da Virada de Urnas às 17h00 (Hoje)
- **Comportamento Automático**:
  - Antes das 17h00: O telão opera em modo **Vitrine / Pré-Apuração** com contagem regressiva e dados de pesquisas eleitorais.
  - Às 17h00 em ponto (horário de Brasília): O sistema transita automaticamente para **Apuração Oficial ao Vivo**, iniciando o polling contínuo a cada 5 minutos nos feeds CDN do TSE.
- **O que fazer**:
  - Testar às 17h01 se as urnas começam a pontuar via `/api/telao/apuracao?p=presidente&uf=br`.

### 2. Download Opcional de Fotos TSE em Massa para Cache 100% Offline
- O proxy `/api/telao/foto` já faz o download sob demanda (on-demand) e salva no disco na primeira vez que qualquer candidato é exibido.
- Se desejar pré-carregar 100% das fotos de todas as UFs para que fiquem salvas no servidor sem depender de requisição externa ao TSE:
  ```bash
  # Na VPS ou localmente:
  node scripts/baixar-fotos-tse.mjs todas
  ```

### 3. Acompanhamento de Novas Legendas Partidárias
- As principais agremiações (PL, PT, UNIÃO, PP, PSD, MDB, REPUBLICANOS, NOVO, PSDB, PDT, PSB, PODEMOS, PSOL, etc.) já possuem cores oficiais cadastradas. Caso surja alguma legenda nova sem cor definida, ela herdará a cor de fallback e poderá ter sua cor hex adicionada em `COR_PARTIDO` em [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx).

---

## 🌐 Informações de Infraestrutura & Produção

- **Servidor VPS**: `169.58.71.28` (Ubuntu / Nginx / PM2 / Node.js)
- **Diretório da Aplicação**: `/opt/pl`
- **Processo PM2**: `pl` (Porta 3080)
- **Domínios Oficiais**:
  - **Principal**: [https://pl.angra.io](https://pl.angra.io)
  - **Espelho**: [https://politica.angra.io](https://politica.angra.io)
- **Rotas Rápidas**:
  - **Telão de Pleitos 2026**: [https://pl.angra.io/telao/pleitos](https://pl.angra.io/telao/pleitos)
  - **Central Mobile de Apuração**: [https://pl.angra.io/c](https://pl.angra.io/c)
  - **Cockpit Estratégico de Campanha**: [https://pl.angra.io/](https://pl.angra.io/)
- **Repositório Git**: Branch `candidato-deploy` sincronizada com `origin`.
