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


---
# Status atual e plano de continuidade — GPT-6.1

Atualização: 04/10/2026, America/Sao_Paulo. Auditoria da aplicação publicada, sem alteração de pesquisas nesta etapa.

## Instrução vigente do usuário

Criar um plano profundo de auditoria dos dados e de evolução da experiência. Preservar a estrutura e a composição do login, com ajustes pontuais. O restante pode ser redesenhado. Incluir relógios e cards compactos. Continuar com GPT-6.1; Gemini é opcional apenas se novas imagens forem necessárias. Não consumir mais créditos de mídia agora.

## O que está publicado e foi observado

- Site: https://pl.angra.io. Servidor autorizado: root@169.58.71.28; aplicação /opt/pl; PM2 pl; porta 3080.
- Dois vídeos distintos de Google Veo 3.1 Fast/Gemini: desktop 16:9, 1280×720; mobile 9:16, 540×960; 4 segundos cada. Aproximadamente 702 KB e 200 KB. Duas gerações, sem regeneração; custo estimado US$ 0,80, sem acesso à fatura/saldo. Grok recusou acesso; não houve geração nele.
- Login reativado. Testes anteriores desta sessão passaram: login existente 200; verificação ausente 400; perfil sem sessão GET/POST 401; perfil inválido autenticado 422. Não foi gravado perfil nem enviada mensagem de OTP nos testes desta auditoria.
- Cadastro em etapas, autofill e reaproveitamento de dados. Vídeo selecionado pela largura; preferência por reduzir movimento remove a fonte e pausa a reprodução.
- A versão publicada mudou durante o trabalho e está MAIS RECENTE que work/sostenes. A inspeção final do telão mostrou busca, seletor rápido de partido, candidatos clicáveis, ordenação correta por percentual e botão Andamento.
- O código publicado já contém FiltroPartidosMini, um relógio no cabeçalho e MiniMapaPleito. É necessário auditar composição, acessibilidade e comportamento antes de recriar qualquer recurso.
- politica.angra.io respondeu HTTPS 200. O status publicado declara esse domínio como espelho. Ainda falta testar equivalência completa de rotas, autenticação, assets e isolamento de cookies nos dois domínios.

## Descoberta principal: governador de São Paulo

Consulta pública: /api/telao/candidatos?uf=sp contém cinco candidatos. /api/telao/boca-de-urna?tipo=pesquisa contém somente Tarcísio, 60%, e Fernando Haddad, 36%, para governador-sp. A soma cadastrada é 96%.

| Candidato | Número | Partido | No app | Divulgação jornalística consultada |
|---|---:|---|---:|---:|
| Tarcísio | 10 | REPUBLICANOS | 60% | 60% |
| Fernando Haddad | 13 | PT | 36% | 36% |
| Vera Lúcia | 16 | PSTU | Sem pesquisa | 2% |
| Vivian Mendes | 80 | UP | Sem pesquisa | 2% |
| Carlos Machado | 21 | PCB | Sem pesquisa | 0% |

Fonte secundária: [UOL/Agência Estado, 03/10/2026](https://noticias.uol.com.br/ultimas-noticias/agencia-estado/2026/10/03/em-sp-tarcisio-tem-60-dos-votos-validos-no-1-turno-e-haddad-36-aponta-quaest.amp.htm). A matéria informa 3.702 entrevistas, campo 02–03/10, margem 2 p.p., confiança 95% e registro SP-04726/2026. Esses valores precisam ser confrontados com relatório original do instituto e registro PesqEle antes de corrigir o app. Não preencher os ausentes automaticamente com base neste documento.

A leitura do servidor confirmou que /opt/pl/data/pesquisa-telao.json não existia no momento da consulta: os valores vinham do fallback PESQUISAS_PADRAO. A tela final mostrou explicitamente SEM PESQUISA nos três candidatos ausentes. Portanto, o problema confirmado é a cobertura incompleta do fallback.

**Correção do diagnóstico preliminar:** a cópia local antiga ordenava alfabeticamente e confundia posição visual com posição na pesquisa. A versão atual do servidor já calcula a posição pelo percentual e ordena corretamente. Não tratar esse defeito antigo como ainda presente em produção.

## Atenção antes de continuar ou fazer deploy

Não publicar a pasta work/sostenes sobre /opt/pl. Ela contém mudanças locais anteriores e diverge do código atual. O telão publicado tem SHA-256 099727e7208c2e553d6a651b1335cb22932696168c617f3cbe1c44c0d1f6b48c na coleta; revalidar, pois outra sessão pode avançar.

Há protótipos locais de mapa colorido, partido na entrada, minimapa de progresso e aviso interno; TypeScript e lint dos novos módulos passaram. Esses protótipos NÃO constituem a versão publicada atual e NÃO devem substituir os recursos mais recentes. O build isolado access-video-20261004 contém ajustes antigos de CSS; não promovê-lo agora.

Partir de uma cópia nova da aplicação atual, sem copiar segredos para entregáveis, preservar dados vivos e comparar alterações. Os arquivos .env, tokens, números privados, logs individuais e perfis não podem entrar no pacote de entrega. Backups prévios: /opt/pl-backups/design-20261004 e /opt/pl-backups/access-video-20261004.

## Plano profundo: auditar pesquisas antes de corrigir

1. Capturar respostas, screenshots, hora da coleta, cargo, UF, turno e cenário do build efetivamente publicado. Separar pesquisa de intenção, boca de urna, projeção e apuração TSE. As evidências públicas já coletadas estão em pesquisa-publicada.json, candidatos-governador-sp.json e auditoria-governador-sp.png.
2. Localizar relatório primário Quaest e PesqEle SP-04726/2026. Conferir contratante, datas de campo/publicação, universo, amostra, metodologia, confiança, margem, pergunta, lista completa de candidatos e base dos percentuais. O acesso direto ao G1 não foi concluído; a matéria secundária não encerra a validação.
3. Mapear a origem efetiva: arquivo persistido → fallback → agregador, incluindo cache, versão e data de ingestão. Os defaults atuais não carregam URL primária nem registro PesqEle estruturado. Documentar a origem por levantamento, não apenas pelo instituto.
4. Construir conciliação candidato a candidato por eleição+UF+cargo+turno+cenário+identificador/número. Alias de nomes não deve unir pessoas diferentes. Verificar candidaturas desistentes, indeferidas, substituídas e duplicadas separadamente da pergunta aplicada pelo instituto.
5. Distinguir null/ausente de zero. A função clean em lib/telao/boca-de-urna.ts da cópia examinada exclui pct <= 0; auditar a versão atual e impedir que um 0% publicado desapareça. Nunca estimar os valores faltantes ou renormalizar os dois líderes silenciosamente.
6. Verificar soma na base correta, incluindo outros/brancos/nulos/indecisos conforme o cenário. Definir tolerância de arredondamento a partir da precisão publicada. Senado com duas escolhas exige outra interpretação; não forçar soma de 100% em uma base de até dois votos por entrevistado.
7. Auditar recorte geográfico: a API e os IDs históricos usam governador-sp/senador-sp, e o cliente troca UF. Confirmar que a pesquisa SP nunca aparece em RJ/DF/outros estados. Sem levantamento da UF selecionada, mostrar ausência explícita. Presidente nacional e presidente por UF devem estar identificados como recortes diferentes.
8. Verificar “última pesquisa” por data de publicação e coleta, não por ordem do array, data sem ano ou cache. Garantir que a origem e o período permaneçam visíveis em cada card.
9. Criar testes necessários: cinco candidatos SP; 0% preservado; null distinto de zero; empate com posição compartilhada; UF trocada; turno/cenário distintos; ausência de levantamento; cache antigo; fonte indisponível; amostra/metadados incompletos. Não criar testes que só reproduzam a implementação.
10. Entregar tabela de divergências, evidências e proposta de correção revisável. Só depois aplicar correção de dados autorizada, com registro de antes/depois e retorno possível.

## Evolução de UX, usando Impeccable

Modo Operate: a tarefa principal é o candidato acompanhar o próprio dia e identificar onde agir. Qualidade deve aparecer na precisão, hierarquia e rapidez. Preservar o login atual e seus vídeos; evitar reconstruir essa tela. Não prometer prêmio ou certificação.

- Entrada: definir home como acesso direto ao login; após sessão válida, encaminhar desktop a /telao/pleitos e celular a /c. Preferir destino explícito persistido e layout responsivo; não criar loops entre /m, / e /c. Revalidar sessão na transição. O snapshot da home desta auditoria tinha estado residual do navegador; repetir em contexto limpo antes de diagnosticar a rota.
- Cabeçalho compacto: candidato, partido, cargo, estado, situação do pleito, relógio de Brasília e última atualização. Opção de alternar candidato sem perder contexto. O relógio já existente deve ser reaproveitado.
- Pequenos cards: posição e evolução com fonte; votos/urnas; diferença para o objetivo; agenda e próxima atividade; pendências da equipe; territórios prioritários; alertas; cobertura de notícias; saúde/idade dos dados. Usar apenas dados reais existentes. Sem fonte, mostrar indisponível e ação adequada.
- Deputado federal/estadual: manter filtros A–Z e colocar os partidos logo à direita de X/Y/Z no desktop. Auditar FiltroPartidosMini existente; hoje há botões com sigla e contagem. Prever nome completo acessível/tooltip, sigla visível e cor secundária. Mobile: linha horizontal navegável e botão para todos, sem depender de hover. Filtro deve funcionar tanto antes quanto durante a apuração.
- Diferenciar filtro de partido, que reduz a lista, de destaque, que mantém adversários visíveis e realça a própria legenda. Manter contagem de resultados e limpar filtros em um gesto. Preservar candidato e UF ao trocar visualização.
- Mapas: escolha colorida de estados, hover/foco com mesma aparência da seleção, clique seleciona, Enter/Espaço equivalentes. Não confundir cor de partido, progresso de urnas e presença de usuários. MiniMapaPleito já existe; auditar cinco cargos, estados aguardando/erro/concluído, presidente por UF e DF distrital antes de ampliá-lo.
- Notícias: tela com nome do candidato/cargo/UF/partido como filtros; feed por relevância e tempo, veículo, horário, link original, motivo da correspondência e favoritar. Deduplicar mesma notícia e controlar homônimos; não chamar menção de apoio nem inventar sentimento.
- Movimento leve: transições de estado entre 150 e 250 ms, sem sequências demoradas na abertura. Vídeo apenas no login/entrada, com pausa e preferência por reduzir movimento. Pulsos do mapa desativados nessa preferência. Respeitar economia de dados.
- Desktop: grade de monitores pequenos com módulo principal dominante; fontes, estado e ações consistentes. Mobile: duas colunas só para métricas curtas; listas e gráficos legíveis em uma coluna. Ordem: situação → ação urgente → comparação → agenda → notícias. Painéis secundários expansíveis.
- Validar 360, 390, 768 e 1440 px; navegação por teclado, leitor de tela, zoom 200%, toque mínimo 44 px, contraste, textos longos, nomes extensos e erros de rede. Um ciclo de screenshots em lote, correções em lote e uma confirmação, conforme Impeccable.

## Cidade e mapa de usuários

O modelo AccessLogEntry já contém city, region, country, latitude e longitude. Investigar se faltam na coleta, na agregação ou só na apresentação. Não inserir uma segunda geolocalização sem verificar a existente.

Definir visitante único, sessão, visita histórica e online antes de desenhar as bolas. Recomenda-se presença por sessão autenticada com heartbeat, online por janela documentada; o código existente usa 5 minutos desde o último acesso, o que precisa ser claramente identificado. Não confundir número de eventos com pessoas.

Usar agregados por cidade/UF: total de visitantes únicos no período, online agora, última atividade e precisão aproximada. Geolocalização por IP não é posição exata; apresentar “não detectada” honestamente. Bolas por escala sqrt/log, limite de tamanho e agrupamento em regiões densas. Hover ou toque mostra total e online; alternativa em lista acessível. Animação só nos grupos online, com pausa/reduced-motion.

Proteger o endpoint de agregados por autenticação e permissão de administração. A versão local examinada de /api/access-log/route.ts tem GET sem verificação própria de sessão; verificar a proteção efetiva atual antes de conectar o mapa. Não expor nomes, IPs ou telefones em ferramenta pública; manter distinção e isolamento por partido.

## WhatsApp confirmado uma vez

Já existem /api/whatsapp-otp/request, /api/whatsapp-otp/verify, lib/otp-store e token curto de verificação, usado no formulário de transparência. Reaproveitar a integração, sem disparar mensagens de teste para terceiros.

Vincular a verificação persistente ao usuário autenticado+telefone normalizado, com verifiedAt e origem; usar o token curto apenas como comprovante para a gravação no servidor. Não usar apenas localStorage nem manter como verificado um telefone alterado. Pedir código na primeira confirmação; mesmo telefone confirmado dispensa repetição, inclusive após novo login. Troca de número requer nova confirmação.

Conferir rate limit, validade, tentativas, reenvio, uso único, falha real de entrega e separação por usuário. Só salvar verificado após sucesso. Testar com mocks e um envio real autorizado ao número de teste escolhido, sem registrar o código ou telefone nos entregáveis.

## Aviso interno e referência TSE

Texto proposto: “Aplicativo não público. Acesso exclusivo para uso interno dos partidos políticos e equipes autorizadas. Informações analíticas; consulte os resultados oficiais do TSE.”

Identificação da mídia: “Vídeo ilustrativo gerado por inteligência artificial com Google Veo 3.1, via Gemini API.” Manter rótulo junto da mídia; disclaimer genérico não substitui identificação acessível. Imagem: OpenAI/ChatGPT. Não afirmar homologação, conformidade integral ou certificação pelo TSE.

Referência: art. 9º-B da Resolução 23.610/2019, alterado pela Resolução 23.755/2026, para dever de informar fabricação/manipulação e tecnologia utilizada em conteúdo sintético empregado em propaganda eleitoral. [Texto oficial](https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-755-de-2-de-marco-de-2026). Não foi identificado um texto único obrigatório para todo aplicativo interno; revisar aplicação concreta da norma. Restrição de uso precisa existir nas permissões, não só no rodapé.

## Ordem de execução para GPT-6.1

1. Obter fonte e status atuais do servidor/branch, comparar com a cópia local e preservar avanços existentes. Registrar início e evidências em status.md.
2. Encerrar auditoria primária da pesquisa SP e produzir conciliação; não mudar percentuais nesta fase.
3. Auditar recursos já publicados: filtros, minimapa, relógio, espelho e login. Definir diferenças concretas antes de implementar.
4. Implementar navegação de entrada e composição móvel preservando o login; em seguida cards/relógios e reposicionamento dos filtros.
5. Implementar verificação persistente de WhatsApp e presença agregada com autorização/isolation; conectar mapa de usuários.
6. Implementar feed de notícias e controles de contexto; concluir aviso interno e identificação de IA.
7. Aplicar apenas correções de pesquisas aprovadas e sustentadas por fonte primária; manter histórico.
8. TypeScript, lint nos módulos alterados, testes de dados/sessão/OTP necessários e verificação visual limitada em desktop e celular.
9. Build em release isolado com dependências corretas. Não copiar dados vivos para produção a partir do staging; watchlist/build-counter são os únicos dados auxiliares exigidos pelo build anterior. Evitar symlinks de node_modules para fora do root com Turbopack.
10. Publicar com backup e rollback para o processo pl, validar os dois domínios, sessão, assets e mobile. Atualizar status.md após cada marco, incluindo o que ficou pendente e instruções verificáveis.

Critério final: fonte correta e completa por cargo/UF/cenário; 0% nunca vira ausência; login preservado; filtros e mapas acessíveis; WhatsApp confirmado persiste corretamente; notícias contextualizadas; monitores legíveis em 360 px; horários/fontes visíveis; nenhum dado sensível público; deploy confirmado nos dois domínios.


## Ampliação dos recortes e auditoria final — solicitação adicional

A auditoria final deve abranger todos os candidatos e levantamentos exibidos, em todos os cargos, UFs, turnos e cenários disponíveis. Conferir associação candidato/partido/número, cobertura completa, percentuais zero versus ausentes, empates, desistências, duplicidades, origem, metodologia, datas, registro da pesquisa e base dos percentuais. Registrar divergências e não tratar dados não verificados como confirmados. A revisão reduz erros; não garante ausência de questionamentos de candidatos.

Incluir recortes de seção eleitoral (urna, quando a fonte permitir), zona eleitoral, município, estado, Brasil e macrorregiões: Sul, Sudeste, Norte, Nordeste e Centro-Oeste. Cada indicador deve mostrar cargo, turno, território, base, fonte e horário da última atualização. No DF, distinguir deputado distrital e não inventar municípios.

Separar claramente duas medidas:
- Votação do candidato: votos do candidato divididos pelos votos válidos do mesmo cargo, turno e território, segundo a base publicada pelo TSE. Para Senado com duas vagas, respeitar a base oficial e a possibilidade de duas escolhas; não confundir votos com eleitores.
- Progresso da apuração: seções/urnas totalizadas divididas pelo total oficial de seções/urnas aptas daquele recorte, usando a definição da fonte. Não apresentar percentual de votos contados como se fosse percentual de urnas. Mostrar também contagens absolutas e a situação da fonte.

Em uma única seção eleitoral, o progresso pode ser discreto (não totalizada/totalizada); não fabricar andamento parcial de uma urna. Um recorte disponível apenas por zona ou município não deve ser anunciado como dado de urna individual.

Agregação regional/nacional deve somar numeradores e denominadores dos territórios, sem média simples de percentuais estaduais e sem dupla contagem de resultados estaduais mais municipais. Usar uma camada territorial única por agregação e a mesma versão temporal de dados, identificando diferenças de atualização. Se faltarem unidades, marcar cobertura incompleta e não pressupor 0 votos ou 0% apurado.

Presidente permite comparar e agregar recortes estaduais, regionais e nacional do mesmo pleito. Governador, senador e deputados pertencem a disputas estaduais distintas: ao ampliar para país/macrorregião, exibir comparação de UFs ou agregação identificada por partido/cadeiras/progresso; não inventar uma eleição nacional de governador nem somar percentuais de candidatos de disputas diferentes. Município/zona/seção mantém o cargo e a eleição correspondentes.

Pesquisas só podem aparecer nos recortes efetivamente amostrados/publicados. Uma pesquisa estadual não é automaticamente válida para uma cidade, seção eleitoral ou região do país. Exibir “pesquisa não disponível para este recorte” quando necessário, mantendo pesquisa separada de apuração oficial.

Interação proposta: país → macrorregião → estado → cidade → zona → seção, com caminho de navegação visível, retorno fácil e seleção do cargo preservada. Mostrar voto do candidato, progresso e qualidade/cobertura da fonte em cards compactos; mobile com seleção progressiva em vez de vários filtros simultâneos. Incorporar aos relógios/cards a idade dos dados e não recalcular percentuais a cada segundo.

Validação necessária: conciliar totais por hierarquia; confirmar composição das cinco regiões; testar denominador zero, ausência de fonte, atualizações parciais, arredondamento, Senado, DF, troca de cargo/turno e cobertura incompleta. Comparar exemplos completos com os dados oficiais em cada nível disponível. Recortes não suportados permanecem explícitos, sem estimativas inventadas.

Estado: requisitos acrescentados ao plano; funcionalidades ainda não implementadas nesta etapa. Preservar o login e auditar a versão publicada atual antes de iniciar alterações.


## Percentuais partidários, hemiciclos e segundo turno — novos requisitos

Estado: requisitos adicionados ao plano para GPT-6.1; ainda não implementados nesta etapa. Preservar o login. Auditar a versão publicada e os componentes Bancadas/PainelBrasil já existentes antes de ampliar.

### Percentual por partido em cada pleito

Oferecer filtros por cargo, UF/território, turno e fonte. Apuração: somar votos nominais dos candidatos do partido no mesmo recorte e apresentar a participação no denominador oficial apropriado. Nas eleições proporcionais, incluir votos de legenda quando a fonte permitir, com separação explícita de votos nominais e legenda. Não misturar votos de partido com votos de federação/coligação, nem duplicar totais. Se o TSE fornecer agrupamento por federação, identificá-lo e não distribuir votos arbitrariamente entre integrantes.

Mostrar sigla/nome, cor, número de candidatos e percentual de votos, acompanhado dos votos absolutos e progresso de apuração. A soma partidária deve conciliar com a base oficial, respeitando arredondamento e grupos sem identificação. Não somar porcentagens de UFs: agregar votos e denominadores. Presidente/governador: identificar partido do candidato e eventual coligação separadamente.

Pesquisa: participação partidária só pode derivar de uma lista completa, mesmo cenário, cargo, base e território, com rótulo de agregação; uma pesquisa parcial não sustenta um ranking partidário completo. Para deputados, não inventar pesquisas por partido a partir de pesquisa presidencial. Senado: distinguir preferência por candidato, número de escolhas por eleitor e base oficial de votos; não chamar participação nos votos de percentual de eleitores.

### Gráfico em formato de Senado / hemiciclo

Aplicar semicírculo ao Senado, Câmara dos Deputados e assembleia/Câmara Legislativa do DF. Reaproveitar Bancadas existente e auditar fonte, contagens e recortes. Oferecer visualizações claramente distintas:

1. Candidatos: pontos ou segmentos representam candidaturas, com total por partido, percentual do total de candidaturas e participação nos votos. Não apresentar candidatos registrados como cadeiras conquistadas. Para milhares de candidaturas, usar segmentos agregados por partido e lista, evitando um ponto ilegível por pessoa.
2. Cadeiras: cada ponto representa uma cadeira; mostrar vagas em disputa, eleitos oficiais e projeções separadamente. Senado deve distinguir vagas desta eleição de composição total da Casa e mandatos que não estão em disputa. Câmara/assembleias: distinguir distribuição oficial de estimativas de quocientes/sobras e federações.

Legenda deve dizer o denominador de cada percentual: participação nos votos, nas candidaturas ou nas cadeiras. Hover/foco/toque: partido, candidatos no recorte, votos, percentual, cadeiras oficiais/projetadas, fonte e atualização. Lista textual acessível equivalente ao gráfico. Cores de partido consistentes; status oficial/projetado também indicado por texto/forma, não só pela cor.

Mobile: semicírculo legível, legenda compacta, lista expansível e alternância Candidatos/Cadeiras. Desktop: hemiciclo compacto junto dos cards de votos, candidatos e cadeiras. Não preencher pontos desconhecidos com resultados simulados; usar categoria aguardando/sem dados.

### Chances de segundo turno — presidente e governadores

Separar três saídas: situação oficial da apuração; distância observada ao limiar legal aplicável; probabilidade modelada de segundo turno. Consulta do resultado oficial e regras atuais do TSE deve preceder implementação. Distância percentual não é probabilidade, e liderança parcial não é resultado final.

O modelo deve usar dados auditados: pesquisas completas comparáveis por cargo/UF/turno/cenário, datas de coleta, amostras, metodologia, base de votos válidos, incerteza e correlações. Se usar apuração parcial, incorporar composição geográfica/seções pendentes e validar o método; não extrapolar votos restantes como se fossem distribuição aleatória. Não transformar margem de erro em uma distribuição gaussiana sem justificar hipótese e desenho amostral.

Proposta de saída: “Chance estimada de segundo turno”, intervalo/qualidade da estimativa, momento da referência, cenário, fontes, versão do modelo e link para metodologia. Se houver modelo conjunto coerente, as probabilidades de vitória no primeiro turno dos candidatos e de segundo turno devem conciliar entre si. Sem dados adequados ou modelo validado, mostrar “estimativa indisponível”, mantendo percentuais observados e margem de incerteza, sem inventar 50%.

Registrar pesos/hipóteses, avaliar calibração com pleitos históricos e testes fora da amostra, comparar baseline simples, investigar mudanças bruscas e documentar limites. Na confirmação oficial, prevalece resultado do TSE; não manter probabilidade incompatível com pleito encerrado. Não apresentar projeção como pesquisa registrada, garantia de vitória ou resultado oficial.

### Auditoria e aceitação

- Conferir todos os partidos/candidatos incluídos e conciliar votos absolutos, porcentagens e base oficial por cargo e recorte.
- Testar legenda, federação, candidato sem partido mapeado, 0%, dados ausentes, troca de UF, Senado com mais de uma escolha, DF e cadeiras ainda sem definição.
- Validar hemiciclo em desktop/mobile e teclado/toque, gráficos sem animação com reduced-motion e lista equivalente para leitor de tela.
- Testar modelo de segundo turno para empate, cenário incompleto, ausência de fonte, incerteza alta, apuração geograficamente enviesada, resultado final e arredondamento junto do limiar. Não confundir esses casos com probabilidades verificadas.
- Atualizar status.md a cada marco, apontando o que é oficial, agregado, projetado ou ainda não validado. Não gerar novas imagens/vídeos para implementar gráficos: preferir SVG leve e dados auditados.

## Execução autorizada do plano — 04/10/2026
Versão isolada /opt/pl-releases/plano-20261004 em validação. Implementações de entrada/login preservado, pesquisa por UF, metodologia, central compacta, WhatsApp e presença. Ainda não publicadas nesta etapa. Produção preservada até conclusão dos testes.
# Status vigente — publicação final em andamento

Atualizado em 04/10/2026 (America/Sao_Paulo). Este bloco substitui instruções antigas de login e confirmação que aparecem no histórico abaixo.

## Comportamento final

- Entrada por registro de uso: nome e WhatsApp, sem senha. Retorno por cookie por 30 dias; desktop abre /telao/pleitos e celular abre /c.
- Confirmação WhatsApp desativada por instrução do usuário. WAHA não foi encontrado ativo e o serviço configurado não respondeu. Telefones declarados não são marcados como verificados.
- Dois vídeos existentes reaproveitados, sem novas gerações pagas nesta etapa.
- Central com relógios, indicadores, metodologia expansível, notícias filtráveis, presença agregada no Brasil, filtros partidários e hemiciclo de candidaturas. O hemiciclo não representa cadeiras eleitas.
- Pesquisas sem dado permanecem sem dado; zero explícito é preservado. Pesquisa estadual não aparece em outro estado. Percentual de urnas regional usa soma de seções, nunca média simples dos estados.
- Registro de uso não permite editar pesquisas nem acessar logs administrativos. Perfis são separados por identidade aleatória do registro; declarar o mesmo telefone não dá acesso a outro perfil.
- Aviso de uso interno dos partidos e identificação de mídia gerada por IA. Esses avisos não substituem revisão jurídica nem representam certificação do TSE.

## Auditoria e validação

- 109 inventários de candidaturas: presidente nacional e quatro cargos nas 27 UFs. Nenhuma inconsistência estrutural detectada nos critérios de identidade, duplicação e UF.
- Três pesquisas cadastradas; nenhuma validada integralmente contra documento primário. NÃO apresentar como pesquisas certificadas.
- São Paulo/governador: somente dois candidatos têm percentual cadastrado. Demais candidatos sem pesquisa não devem receber zero por inferência.
- Dez verificações automatizadas de limpeza, cobertura, denominadores e OTP passaram. Fluxo de registro, retorno, perfil sem confirmação, isolamento entre registros e proteção administrativa passou em ambiente isolado.
- Compilação final e publicação no servidor autorizado estão em andamento. Dados e configurações de produção serão preservados; dados sintéticos do ambiente de teste não serão copiados.

## Continuidade com GPT-6.1

1. Abrir o código atual em /opt/pl no servidor root@169.58.71.28. Não usar work/sostenes, que é uma cópia antiga. Código desta execução: work/sostenes-exec.
2. Conferir auditoria-final-cadastros-pesquisas.json. Para cada pesquisa, obter relatório primário, registro PesqEle quando aplicável, datas de campo/publicação, amostra, universo, ponderação, margem/intervalo, pergunta e base de cálculo. Conferir candidato por candidato antes de publicar qualquer correção. Preservar o histórico de valores e a fonte.
3. Validar a pesquisa de Senado considerando número de escolhas e denominador. Não presumir que todos os resultados devam somar 100%.
4. Consolidar auditoria externa de todas as pesquisas. Os testes estruturais concluídos não provam correção dos números publicados pelas fontes.
5. Probabilidades de segundo turno exigem modelo calibrado e validação histórica; continuam indisponíveis. Integração de agenda/metas pessoais, recortes por seção individual e autorização institucional por partido continuam pendentes.
6. Presença conta registros de navegador, não pessoas identificadas. Múltiplos dispositivos podem contar mais de uma vez. Notícias usam filtros textuais e precisam de revisão de homônimos.
7. Se reativar WhatsApp, verificar sessão real WAHA e envio autorizado. Só marcar telefone verificado após prova válida; não tornar obrigatório sem nova decisão do usuário.
8. Antes de futuras publicações, executar next build e scripts/tests/research-audit.cjs, verificar acesso registrado e privacidade, revisar desktop e mobile e atualizar este status.


## Deploy concluído — 04/10/2026

- Publicado em https://pl.angra.io e https://politica.angra.io. PM2 pl reiniciado e aplicação respondeu na porta 3080.
- Backup para reversão: /opt/pl-backups/plano-20261004-143556. Contém source.tgz, .next e build-counter.json. Para reverter: restaurar esses três itens em /opt/pl e executar pm2 restart pl --update-env. Preservar .env e dados atuais.
- Navegador nos dois domínios: raiz e dois vídeos HTTP 200; presença e logs HTTP 401 para visitante anônimo. Consulta Python recebeu bloqueio HTTP 403 do intermediário de rede; navegador real confirmou disponibilidade.
- Compilação final passou com TypeScript e dez verificações de auditoria. Não houve novas gerações de mídia nesta etapa.
- Confirmação WhatsApp removida como solicitado. Registro simples publicado; telefones não são marcados como verificados.
- Pendências: validar as três pesquisas por documentos primários; realizar revisão visual adicional de todos os modos; implementar integrações de agenda, autorização institucional e modelos/recortes avançados descritos acima. Revisão independente de acabamento interrompida por limite de uso, sem aprovação emitida.


Validação final adicional: fluxo de registro sem senha, retorno por cookie, perfil sem confirmação, isolamento entre dois registros com o mesmo telefone e proteção de logs/edição de pesquisas passaram na compilação final. Capturas telao-desktop-final.png e telao-mobile-final.png foram salvas. A captura mobile ainda mostra superfícies em tom creme do tema legado; a revisão visual completa permanece pendente, sem alegação de acabamento premiado.

## Complemento em andamento — rodapé, notícias e redes (04/10/2026)

- Pedido atual: assinatura “by TITAN PESQUISAS e ANGRA.IO” nos dois domínios, ticker de notícias mobile e área de movimentação pública do candidato selecionado.
- Implementado: assinatura no aviso legal global; ticker mobile com links às notícias, pausa, foco e movimento reduzido; painel Redes na central com seleção explícita de candidato e canal público YouTube.
- YouTube usa RSS público com até 15 publicações; contagem parcial dos últimos 7 dias, fonte e horário da coleta. Não estima seguidores, alcance, sentimento ou intenção de voto. Associação do canal é informada pelo usuário e precisa ser conferida.
- Instagram, Facebook, X e TikTok seguem sem métricas, aguardando links oficiais e fontes permitidas. Pedido de links enviado ao usuário. Nenhuma API paga foi ativada.
- Acesso administrativo separado: /admin autentica pela credencial principal existente e encaminha a /log. Registro de uso e credenciais provisórias não autorizam logs. Nunca compartilhar credencial principal; se já compartilhada, trocar os segredos administrativos e revogar sessões.
- Compilação e publicação deste complemento em andamento; atualização de confirmação virá após os testes.

## Instrução vigente do complemento — coleta automática (04/10/2026)

O usuário decidiu usar Google Trends e YouTube, exclusivamente quando houver coleta direta. Importação CSV e campos de preenchimento manual foram removidos antes da publicação. As notas anteriores sobre CSV/canal informado pelo usuário são histórico de alternativas descartadas.

- Google Trends: feed RSS público de tendências atuais do Brasil, comprovado HTTP 200 no servidor. Cruzamento textual com nome do candidato, sem série 0–100, sem inferir votos/apoio. Fora do feed não significa ausência de interesse. Homônimos continuam como limite metodológico.
- YouTube: RSS público de canais identificados, comprovado HTTP 200 para Lula (@LulaOficial, UCvO2BExvkAbGMsTGnEnI_Ng) e Tarcísio (@tarcisiogdf, UC9KMn-rfwWXb7JXepLWnx-w). Até 15 vídeos recentes, atividade parcial de 7 dias, última publicação e visualizações quando informadas pelo feed. Outros candidatos não recebem canal presumido. Nenhuma API paga ou conta externa ativada.
- Barra branca superior compactada: cards com 40px mínimos em vez de 58px, tipografia e espaços menores; relógio duplicado ocultado, relógio da central preservado.
- Fotos: imagem posicionada dentro do círculo em largura/altura 100%, object-fit cover e object-position center center; sem deslocamentos ou transformações herdadas.
- Rodapé global: by TITAN PESQUISAS e ANGRA.IO. Ticker mobile com notícias reais e links, pausa, foco, respeito a movimento reduzido e altura calculada do aviso legal para evitar sobreposição.
- Acesso aos logs: /admin com credencial principal já configurada; /log e /api/access-log bloqueiam registro de uso e credenciais provisórias. Nunca entregar credencial principal aos candidatos.
- Pesquisas SP: somente Tarcísio e Haddad têm percentual cadastrado. Não preencher os demais com zero até conferir fonte primária.

## Decisão final sobre logs — 04/10/2026

O usuário pediu apenas um link diferente e dispensou proteção por login. Endereços definidos: https://politica.angra.io/gestao-uso e https://pl.angra.io/gestao-uso. A página é acessível sem senha; não é exibida na navegação dos candidatos e pede noindex/nofollow. Qualquer pessoa que tiver ou descobrir o link pode acessar. Isso substitui a orientação anterior de usar /admin para consultar os logs. A rota antiga /log e sua API mantêm a regra administrativa anterior.

Durante a conferência foram encontradas credenciais/segredo padrão. As variáveis ausentes de autenticação foram configuradas com valores privados no servidor, preservando a segurança de edição administrativa das pesquisas. A credencial fica em /opt/pl/admin-access.txt (permissão 600), não é necessária para /gestao-uso. A mudança do segredo exige novo registro de uso nos navegadores com cookie antigo. Nenhum segredo foi incluído nos documentos entregues.

As fontes Google Fonts falharam intermitentemente durante builds. Arquivos já publicados foram reaproveitados em app/fonts e os layouts passaram a next/font/local, eliminando downloads na compilação. Fonte e aparência preservadas para Latin/português.

Complemento final em compilação/teste/deploy. Não adicionar novas funcionalidades nesta etapa: o usuário priorizou publicação imediata.
# Complemento publicado — 04/10/2026

- Deploy concluído em https://pl.angra.io e https://politica.angra.io, aplicação PM2 pl online. Backup: /opt/pl-backups/plano-20261004-145851.
- Raiz e /gestao-uso responderam HTTP 200 nos dois domínios via navegador. /gestao-uso não exige senha, conforme a decisão final do usuário; quem souber o endereço pode consultar os logs.
- Rodapé: by TITAN PESQUISAS e ANGRA.IO. Notícias no ticker mobile com pausa, links e respeito a movimento reduzido.
- Barra branca compactada, relógio duplicado retirado do cabeçalho, fotos centralizadas no recorte circular.
- Radar automático: Google Trends retornou 10 termos do feed Brasil no teste; canais identificados de Lula e Tarcísio retornaram 15 vídeos cada. Não há importação CSV ou preenchimento manual. Sem canal identificado/feed disponível, não há dados YouTube atribuídos ao candidato.
- Google Trends é feed de tendências gerais, não série 0–100 para qualquer candidato. Correspondência textual pode conter homônimos. Ausência no feed não significa ausência de buscas. Não usar esses dados como pesquisa de opinião.
- Compilação e TypeScript passaram. Dez verificações de auditoria passaram; fluxo de registro e isolamento de perfis passou; edição de pesquisas e API administrativa mantiveram proteção. Teste da rota pública /gestao-uso passou sem sessão.
- Nenhuma mensagem WhatsApp enviada, nenhum crédito novo de mídia consumido e nenhuma integração paga ativada.
- Pesquisas: os números cadastrados não foram corrigidos por inferência. As três pesquisas ainda dependem de fontes primárias; SP/governador continua com três candidatos sem percentual cadastrado.

Orientação para continuidade: usar o código publicado em /opt/pl, consultar auditoria-final-cadastros-pesquisas.json e o histórico abaixo. Não usar work/sostenes, cópia antiga. Pendências de validação externa e refinamento de todos os modos permanecem registradas. A configuração privada de autenticação fica no servidor e não faz parte do pacote de continuidade.

---


## Correção final do ticker publicada — 04/10/2026

Deploy da correção concluído. Backup mais recente: /opt/pl-backups/plano-20261004-150348. No viewport de 390px, ticker ficou entre y=705 e y=754, rodapé começou em y=754,22: sem sobreposição. Portal no body confirmado. Captura: ticker-mobile-publicado.png. Cabeçalho desktop medido em 199,38px; object-position das fotos confirmado em 50% 50%. Compilação e TypeScript passaram. /gestao-uso permanece sem senha conforme pedido.

## Correção urgente — filtros e nomes/WhatsApps nos logs (04/10/2026)

- Falha vista na captura do usuário: os botões dos partidos encolhiam enquanto o texto mantinha largura, sobrepondo todos os nomes. Correção: botões sem flex-shrink, largura pelo conteúdo e trilho de rolagem horizontal independente; no celular, letras e partidos em linhas separadas.
- Os registros de uso já estavam persistidos em data/telao-registros.jsonl com nome e WhatsApp. A tela de logs consultava somente leads antigos e onboarding. readCadastros agora inclui os registros de uso existentes, sem migração, regravação ou dedução de identidade por IP.
- /gestao-uso continua sendo o link sem senha definido pelo usuário. Cabeçalho explicita WhatsApp/contato e origem “registro de uso”.
- Cópia privada dos dados realizada no servidor antes da publicação. Os arquivos data/access-log.jsonl, telao-registros.jsonl e demais cadastros NÃO serão substituídos pelo ambiente de teste. Após publicar, verificar que o prefixo de bytes existente continua íntegro, permitindo novos acessos anexados durante o deploy.
- Compilação e validação em andamento. Nenhum cookie, segredo, pesquisa ou registro existente foi alterado por este hotfix.

Última orientação: retirar somente o card contador “Cadastros” da tela de logs. Card removido; lista de pessoas com nomes e WhatsApps permanece. Nenhum registro excluído. Compilação final incorpora esta alteração junto da correção dos filtros.

## CÉDULA CANCELADA E RETIRADA — 04/10/2026

O usuário retirou expressamente o pedido da cédula. A funcionalidade NÃO chegou a ser publicada e nenhuma resposta foi coletada. Código, endpoints e tela da proposta foram removidos. A entrada continua apenas como registro de uso, sem perguntas de voto. Preservar essa decisão em qualquer continuidade; não reativar cédula ou enquete. Permanecem somente a correção dos filtros e a lista de nomes/WhatsApps nos logs, com o card contador de cadastros removido.
## Publicado — notícias gerais e correções urgentes
- Página /telao/noticias publicada para desktop e mobile nos dois domínios; busca textual, fontes e horários. Card Notícias · todos os cargos abre a lista. Radar inicia com todas as notícias.
- Build de produção aprovado. Aplicação respondeu 200 para ambos os hosts com título e busca corretos. Verificação externa automatizada recebeu 403; validação realizada diretamente no servidor.
- Backup deste deploy: /opt/pl-backups/plano-20261004-153732. Nenhum arquivo de registros foi substituído.
- Hotfix anterior: 27 botões de partidos com texto dentro dos limites; card Cadastros removido, 8 registros com nomes e WhatsApps visíveis no log. Prefixos dos 119 eventos anteriores preservados, 129 eventos na conferência anterior.
- Cédula cancelada, sem publicação nem respostas; /cedula retorna 404.
- Pendente: validação primária das três pesquisas; ausência de percentual não é convertida em zero.

