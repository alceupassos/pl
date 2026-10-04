# Dashboard Eleitoral Brasil 2026 — Pesquisa Técnica: Fontes de Dados, Pipeline e Arquitetura (estilo Polymarket mobile)

## TL;DR
- **Construa sobre fontes oficiais e gratuitas como espinha dorsal**: o TSE entrega tudo o que você precisa via download direto da CDN (`cdn.tse.jus.br`) — candidaturas, resultados em tempo real (JSON na apuração), e, crucialmente, **as pesquisas eleitorais registradas no PesqEle como CSV em massa, atualizado diariamente** (`pesquisa_eleitoral_2026.zip`). Câmara e Senado têm APIs REST/JSON abertas e bem documentadas. Bright Data e kondado.com.br são **complementos opcionais**, não a base — você raramente precisará deles para dados públicos brasileiros.
- **Para o produto estilo Polymarket mobile**: adote um stack Next.js (App Router) + PWA, gráficos com **Recharts** (padrão) ou **Visx** (quando precisar de controle total), cards de mercado com probabilidade implícita, gráficos de linha de evolução temporal, e atualização via SWR/polling (não WebSockets, dadas as restrições serverless). A probabilidade não vem do TSE: você a **modela** a partir do agregador de pesquisas (média ponderada por recência, tamanho amostral e qualidade do instituto, com simulação Monte Carlo para o intervalo).
- **O maior risco técnico não é coletar dados, é tratá-los**: normalizar metodologias divergentes (presencial vs. telefone vs. web/painel), corrigir "house effects" dos institutos, e comunicar incerteza honestamente. Trate o dashboard como ferramenta de acompanhamento, não previsão — exatamente como Poder360, O Povo e Eleição em Dados fazem.

## Key Findings

### Parte A — Acesso e tratamento de dados

**1. TSE é a fonte primária e cobre quase tudo, gratuitamente.** O Portal de Dados Abertos (`dadosabertos.tse.jus.br`, rodando CKAN 2.9.3) substituiu o antigo Repositório de Dados Eleitorais em janeiro de 2022. Há dois caminhos principais: (a) **download direto de arquivos** na CDN — o mais robusto e recomendado; (b) a **API DivulgaCandContas** (REST, não documentada oficialmente, sem suporte a CORS) — use apenas para recortes específicos.

**2. As pesquisas eleitorais estão disponíveis em massa como CSV diário** — esta é a descoberta mais importante para o seu caso de uso. O PesqEle (sistema de registro obrigatório) publica os dados no Portal de Dados Abertos com atualização **diária**, licença CC-BY.

**3. Câmara e Senado têm APIs REST/JSON abertas e maduras**, com atualização diária, sem autenticação.

**4. Bright Data e Kondado são opcionais.** Bright Data é caro e desenhado para sites com anti-bot; dados eleitorais brasileiros são abertos, então você raramente justifica o custo. Kondado é um ELT no-code brasileiro útil se você quiser evitar engenharia de pipeline, mas seus conectores são de marketing/CRM, não de fontes governamentais eleitorais.

**5. A "probabilidade estilo Polymarket" precisa ser modelada por você** a partir das pesquisas — o Brasil não tem um mercado de previsão líquido para suas eleições. Os agregadores nacionais (Poder360, O Povo, Eleição em Dados) usam médias móveis ponderadas.

### Parte B — Arquitetura e design

**6. Polymarket é mobile-first e funciona como PWA, não app nativo.** O padrão central é o **market card**: descrição do evento + probabilidade proeminente + um único call-to-action. Gráficos de linha limpos comunicam probabilidade ao longo do tempo (não candlesticks).

**7. Stack recomendado**: Next.js + Tailwind + Recharts/Visx + Postgres (com TimescaleDB para séries) + SWR para revalidação.

## Details

### 1. TSE — inventário de endpoints e formatos

**Download direto via CDN (recomendado).** O padrão de URL é estável e previsível:

- **Candidaturas**: `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip`. Cada ZIP contém um CSV por UF mais um consolidado nacional (`consulta_cand_2026_BRASIL.csv`). Encoding **Latin-1 (ISO-8859-1)**, separador `;`. Campos-chave: `SG_UF`, `DS_CARGO` (Presidente, Governador, Senador, Deputado Federal), `NM_CANDIDATO`, `NM_URNA_CANDIDATO`, `NR_CPF_CANDIDATO`, `SG_PARTIDO`, `NM_COLIGACAO`, `DS_SITUACAO_CANDIDATURA` (filtre por candidaturas deferidas), `DS_SIT_TOT_TURNO` (resultado). Histórico desde 1994 — essencial para os comparativos com 2018/2022.
- **Resultados (pós-pleito, base estatística)**: datasets `resultados-2022`, `resultados-2024` etc. no portal CKAN.
- **Pesquisas eleitorais (PesqEle) em massa**: `https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip`, mais os arquivos complementares `pesquisa_contratante_2026.zip` e `pesquisa_pagante_2026.zip`. Atualização **diária**, fonte "Sistema Pesqele", licença CC-BY. Dataset: `dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026`. Há também ZIPs de questionários e notas fiscais em PDF. Dados disponíveis desde 2012.

**API DivulgaCandContas (REST).** Usada internamente pelo sistema web `divulgacandcontas.tse.jus.br`. Não documentada oficialmente; a melhor referência é a documentação não-oficial em `github.com/augusto-herrmann/divulgacandcontas-doc` (arquivo `divulgacandcontas-swagger.yaml`). **Não suporta CORS** — chamadas devem vir do seu backend, não do navegador. Cuidado com rate limiting (intervalos entre requisições; múltiplos 404 podem bloquear seu IP). Há um servidor MCP da comunidade (`github.com/karnagge/mcpcand`) que implementa endpoints como `listar_candidatos_municipio`, `consultar_candidato`, `listar_cargos_municipio`.

**Apuração em TEMPO REAL (noite da eleição).** Esta é a parte mais sensível. O TSE publica arquivos **JSON estáticos** na CDN de resultados, consumidos pelo app oficial `resultados.tse.jus.br`. O padrão de URL (validado em 2022): 
- Config geral: `https://resultados.tse.jus.br/oficial/comum/config/ele-c.json` (lista pleitos/eleições e seus códigos)
- Dados simplificados por abrangência: `https://resultados.tse.jus.br/oficial/ele2022/544/dados-simplificados/br/br-c0001-e000544-r.json` — onde `544` é o código da eleição federal (presidente), `br`/`sp`/`ap` é a abrangência (Brasil ou UF), e o arquivo traz votos totalizados, % e situação. Para governador/senador/deputado, processados no TRE, usa-se os códigos estaduais e a UF na URL.
- O atributo `e` no elemento `cand` indica eleito/2º turno (`s`/`n`); o atributo `vaga` mostra vagas por coligação em eleições proporcionais.

Para 2026, o TSE confirmou que a solução será novamente via arquivos JSON, com audiência pública técnica prevista para o início de julho de 2026, e recomendou usar as especificações de 2024 como referência. **Diretrizes nos artigos 264–269 da Resolução de Atos Gerais nº 23.751/2026.** Estratégia prática: durante a apuração, faça polling desses JSON a cada ~30–60s a partir do seu backend, com cache, e empurre para o cliente.

**Atenção a armadilhas do TSE**: encoding Latin-1; arquivos podem exceder o limite de ~1 milhão de linhas do Excel; a partir de 2022 coligações em eleições proporcionais foram substituídas por **federações partidárias** (muda os campos); CDN pode ficar lenta em pico eleitoral.

### 2. Câmara dos Deputados — API de Dados Abertos

Base: `https://dadosabertos.camara.leg.br/api/v2/`. REST, JSON/XML, OpenAPI documentado, atualização diária, sem autenticação. Endpoints relevantes: `/deputados`, `/deputados/{id}/votacoes`, `/votacoes`, `/votacoesVotos`, `/proposicoes`, `/partidos`, `/blocos`, `/frentes`. Há também download de arquivos em massa por ano: `http://dadosabertos.camara.leg.br/arquivos/votacoes/{formato}/votacoes-{ano}.{formato}` (formatos csv, json, xlsx, ods, xml). Útil para compor o painel de Deputado Federal com dados de mandato/votações dos eleitos.

### 3. Senado Federal — API de Dados Abertos

Base: `https://legis.senado.leg.br/dadosabertos/`. Saída padrão XML; adicione sufixo `.json` para JSON. Documentação em `legis.senado.leg.br/dadosabertos/docs/index.html` e Swagger. Endpoints: `/senador/lista/atual`, `/senador/{codigo}`, `/senador/{codigo}/votacoes`, `/senador/{codigo}/discursos`, `/materia/...`, `/blocoParlamentar/lista`. Útil para o painel de Senador (confira a regra de renovação de cadeiras aplicável a 2026). Existe a lib Python `DadosAbertosBrasil` que encapsula essa API.

### 4. Pesquisas eleitorais — registro PesqEle e agregadores

**Como funciona o registro.** A Lei 9.504/1997 (arts. 33–35) e as Resoluções TSE 23.600/2019 (com alterações da 23.727/2024 e da 23.747/2026, vigente para 2026) obrigam o registro de toda pesquisa para divulgação pública no sistema PesqEle, com antecedência mínima de 5 dias da divulgação. Os dados ficam públicos por 30 dias na consulta web.

**Como acessar (recomendação prática).** O site público `pesqele-divulgacao.tse.jus.br` é uma aplicação **JSF/PrimeFaces (.xhtml)** com proteção anti-bot ("Acesso Rejeitado") — **não tem API JSON pública e é ruim para scraping**. Em vez disso, use o **download em massa CSV diário** do Portal de Dados Abertos (item 1 acima): `pesquisa_eleitoral_2026.zip` + `pesquisa_contratante_2026.zip` + `pesquisa_pagante_2026.zip`. Para descobrir URLs programaticamente, use a **CKAN Action API**: `https://dadosabertos.tse.jus.br/api/3/action/package_show?id=pesquisas-eleitorais-2026` retorna os recursos em JSON. Cada ZIP traz um `leiame.pdf` com o dicionário de dados.

**Campos de uma pesquisa registrada**: número de registro (`BR-XXXXX/2026` nacional ou `UF-XXXXX/2026` estadual), eleição, cargo, município/UF, instituto + CNPJ, contratante(s)/pagante(s), estatístico responsável + registro CONRE, tamanho da amostra (n), margem de erro, nível de confiança, datas de registro/divulgação/campo (início e fim), valor, metodologia/plano amostral/ponderação, e PDFs de questionário e nota fiscal.

**Scrapers existentes**: `conre3/pesqEle` (pacote R, scraping do HTML, output de 24 colunas) e o fork `pindograma/pesqEle` — ambos efetivamente **abandonados/aposentados** (feitos para 2018). Não use como base; prefira o CSV oficial.

**Institutos principais 2026**: Datafolha, Quaest, Ipec, AtlasIntel, Paraná Pesquisas, PoderData. Metodologias divergem fortemente — a AtlasIntel usa recrutamento digital aleatório (web) com amostras grandes: na rodada de abril/2026 ouviu **5.008 pessoas (22–27 de abril, margem de 1pp, registro TSE BR-07992/2026)** e na de maio **5.032 pessoas (13–18 de maio, registro BR-06939/2026)**; outros institutos usam coleta presencial ou telefônica. Isso causa "house effects" mensuráveis que seu agregador precisa tratar.

**Agregadores como referência**:
- **Poder360** — o mais antigo do país; o acervo "começou a ser compilado pelo jornalista Fernando Rodrigues, diretor do Poder360" no ano 2000, e a ferramenta foi feita "em parceria com a Google News Initiative e o Volt Data Lab". Usa média móvel ponderada cuja janela "considera os resultados de levantamentos de diferentes empresas de pesquisas, realizados num período de **60 dias** (antes e após o ponto específico)". Sérgio Spagnuolo (fundador do Volt Data Lab) confirmou à Abraji que "os americanos RealClearPolitics e FiveThirtyEight" foram "inspirações do Poder360", e que "o Poder e o Volt optaram por utilizar uma média móvel no período considerado para conseguir atenuar as diferenças entre metodologias".
- **O Povo (DATADOC)** — média móvel ponderada de **30 dias** (não 15): "calculamos a média móvel ponderada dos últimos 30 dias... uma janela de tempo de 30 dias consegue minimizar o impacto de períodos com poucas pesquisas coletadas"; pesos por qualidade/recência/histórico do instituto, com seleção de institutos por registro na Justiça Eleitoral.
- **Eleição em Dados** — média ponderada por recência e tamanho amostral; IC 95% via **Monte Carlo com 10 mil simulações**; calcula probabilidade de Top-2 e de liderança, com API pública declarada.
- **Pindograma** documentou bem a metodologia (projeto já descontinuado).

### 5. Bright Data e Kondado — avaliação prática

**Bright Data** (`brightdata.com`): plataforma de proxies (residenciais, datacenter, ISP) + Web Scraper APIs + datasets prontos + Browser API. Preços por consumo: Web Scraper API a partir de ~$0,75–1/1.000 registros; proxies residenciais ~$2,50–5/GB; SERP/Unlocker/Crawl a partir de ~$1/1.000 requisições; datasets a partir de ~$250/100k registros; planos gerenciados de $250 a $1.500/mês. **Veredito para seu caso**: não recomendado como base. Os dados eleitorais brasileiros são abertos (CSV/JSON sem anti-bot real, exceto o PesqEle web — que você contorna via CSV). Bright Data só faz sentido se você quiser raspar fontes secundárias com proteção pesada (ex.: agregadores de terceiros, redes sociais de candidatos em escala) — e mesmo aí, avalie alternativas mais baratas (Apify, Scrape.do a partir de $29/mês).

**Kondado** (`kondado.com.br` / `kondado.io`): ELT/ETL no-code brasileiro, a partir de ~$19/mês, 14 dias grátis. Conecta 80+ fontes (CRMs, ERPs, mídias, bancos) e envia para BigQuery, PostgreSQL, Redshift, S3, MySQL, SQL Server, Google Sheets, Power BI, Looker Studio. Tem conector genérico de "Brasil.io". **Veredito**: útil apenas se você quiser evitar escrever pipelines e centralizar dados num data warehouse com pouco código — mas **não tem conectores nativos para TSE/Câmara/Senado**, então a coleta das fontes eleitorais ainda exigiria scripts próprios ou um conector custom. Para um produto sério com apuração em tempo real, um pipeline próprio em Python (requests + pandas + agendador) é mais flexível e barato.

### 6. Tratamento de dados — pipeline recomendado

- **Ingestão**: jobs Python agendados (Airflow/Prefect/Dagster, ou cron simples) baixando os ZIPs do TSE (candidaturas + pesquisas diárias) e consumindo APIs Câmara/Senado. Na noite da eleição, um worker dedicado faz polling dos JSON de `resultados.tse.jus.br`.
- **Armazenamento**: PostgreSQL como base relacional; **TimescaleDB** (extensão Postgres) ou tabelas particionadas por data para as séries temporais de pesquisas e da apuração. Guarde cada pesquisa como um fato (instituto, data de campo, cargo, UF, cenário, candidato, %, n, margem).
- **Normalização**: padronize nomes de candidatos (mesmo problema dos agregadores — grafias diferentes entre institutos e eleições), cargos, UFs e cenários (1º turno estimulado vs. espontâneo, 2º turno). Mantenha o "cenário" como dimensão — só compare pesquisas no mesmo cenário.
- **Agregação de pesquisas (o núcleo do produto)**: implemente uma **média móvel ponderada** combinando (a) recência (decaimento temporal, ex.: janela de 14–60 dias), (b) tamanho amostral, e (c) qualidade/histórico do instituto. Some uma **correção de house effects** (regressão multinível bayesiana comparando cada instituto à média, como o FiveThirtyEight/538), com encolhimento (shrinkage) para não reagir a ruído. Lembre: agregar reduz erro aleatório mas **não corrige viés sistemático** se todos os institutos erram na mesma direção (como ocorreu nos EUA em 2016/2020).
- **Modelagem de probabilidade ("estilo mercado")**: converta a média e sua incerteza em probabilidades via **simulação Monte Carlo** (ex.: 10.000 simulações, como o Eleição em Dados) — P(liderar 1º turno), P(ir ao 2º turno / Top-2), P(vencer 2º turno). Distribua o erro com cauda pesada (Student-t) para robustez a outliers. **Deixe explícito que é modelo, não previsão de urna.**

### 7. Design estilo Polymarket mobile

**Padrões de UI confirmados**:
- **Market card** é a unidade central: evento + probabilidade proeminente + elemento visual (foto/cor do candidato) + indicador de volume/tendência + um CTA. No mobile, mostre **apenas evento + probabilidade + uma ação** — degrade graciosamente.
- **Probabilidade implícita** em destaque (ex.: "Lula 62% para vencer"), convertida de %.
- **Gráficos de linha limpos** para evolução temporal (probabilidade ao longo do tempo), não candlesticks/order books. Comunicar incerteza, não preço.
- **Thumb-zone**: ações alcançáveis com o polegar; toques grandes e espaçados.
- **PWA**: Polymarket não tem app nativo — usa PWA adicionada à tela inicial (tela cheia, carregamento rápido, gestos: swipe horizontal navega o gráfico, vertical rola a página). Segundo a Lazer Technologies (empresa que construiu o app), antes da eleição americana de 2024 o app "jumped up the App Store rankings for Magazines & Newspapers, surpassing major players such as the Wall Street Journal and CNN, and competing with the New York Times app to reach the #1 spot". Limitações de PWA: push notifications menos confiáveis, sem offline pleno, restrições do iOS.
- **Progressive disclosure**: básico em cima, complexidade (metodologia, todas as pesquisas) atrás de tabs/scroll. Isso mapeia direto para o requisito "uma aba com principais números, outra com todos os dados".

**Stack técnico recomendado**:
- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS. Use Server Components para dados pesados/estáticos e Client Components para os gráficos interativos. ISR para métricas que não precisam de tempo real; SSR para a apuração.
- **Gráficos**: **Recharts** como padrão (SVG, declarativo, ~27,2 mil estrelas no GitHub e ~48–49 milhões de downloads semanais no npm — classificada como projeto-chave do ecossistema pela Snyk; ótimo para séries e responsivo via `ResponsiveContainer`). **Visx** (Airbnb) quando precisar de visualizações customizadas estilo Polymarket com controle total — mais código, mais flexível. Evite D3 puro (curva íngreme). Para SSR no App Router, prefira libs SVG (Recharts/Visx) que produzem markup inicial.
- **Tempo real**: **NÃO use WebSockets se for hospedar em Vercel/serverless** (não suportam conexões persistentes). Para a apuração, use **SWR com polling/revalidação** (o próprio dashboard da Vercel usa SWR) ou SSE. WebSockets só se hospedar em Node dedicado (Railway/Render/VM). Dado que a fonte (TSE JSON) já é polling, SWR a cada 30–60s é a escolha pragmática e robusta.
- **PWA**: configure manifest + service worker (Serwist/Workbox) para instalação na tela inicial e cache stale-while-revalidate dos dados.
- Há até bibliotecas open-source de componentes prontos estilo prediction market (ex.: registry shadcn `purrdict` com MarketCard, ProbabilityChart, etc.) que servem de inspiração de arquitetura de componentes.

### 8. Comparativos históricos (2018, 2022)

Use os datasets `consulta_cand_2018/2022` e `resultados-2018/2022` do TSE como camada de comparação. Padrões de visualização: sobreponha a trajetória da pesquisa atual contra o resultado final daquele cargo/UF em 2022; mostre "naquele momento do ciclo, o líder tinha X%". Cuidado metodológico: federações partidárias só existem a partir de 2022, e o conjunto de institutos muda entre ciclos. Overlay de probabilidade contra timeline de eventos reais (como Polymarket faz) ajuda a explicar movimentos.

## Recommendations

**Fase 1 — Fundação de dados (agora até convenções, 20/07–05/08):**
1. Monte o pipeline de ingestão Python para os ZIPs do TSE (candidaturas + `pesquisa_eleitoral_2026.zip` diário) e as APIs Câmara/Senado. Armazene em PostgreSQL/TimescaleDB.
2. Carregue os históricos 2018/2022 para a camada de comparação.
3. Construa o normalizador de nomes/cargos/UF/cenários — é o trabalho mais subestimado.

**Fase 2 — Agregador e modelo (até a prestação parcial, 13/09):**
4. Implemente a média móvel ponderada + correção de house effects. Comece simples (média ponderada por recência e n, janela de 30–60 dias como Poder360/O Povo) e evolua para o modelo bayesiano.
5. Adicione a camada Monte Carlo para probabilidades (P de liderar, Top-2, vencer 2º turno). Rotule claramente como modelo.
6. Valide o agregador contra os agregadores públicos (Poder360, O Povo, Eleição em Dados) — se divergir muito, investigue.

**Fase 3 — Produto mobile (até 1º turno, 04/10):**
7. Construa o PWA Next.js com market cards por cargo (Presidente, Governador por UF, Senador por UF, Deputado Federal), tabs "principais números" vs. "todos os dados".
8. Use Recharts para as linhas de evolução; reserve Visx para o card de probabilidade hero.
9. Garanta paridade web/mobile com a versão mobile como principal (referências do próprio usuário: `candidatos.angra.io/m` e `candidatos.angra.io`).

**Fase 4 — Apuração ao vivo (04/10 e 25/10):**
10. Worker dedicado fazendo polling dos JSON de `resultados.tse.jus.br` a cada 30–60s, com cache e fallback. Teste a construção de URLs por UF antecipadamente (acompanhe a audiência pública de julho e as specs de 2024).
11. SWR no cliente para refresh suave; skeleton loaders durante fetch.

**Benchmarks que mudam as decisões**: se o volume de pesquisas estaduais for baixo (comum fora de SP/MG/RJ), aumente a janela da média móvel para 60 dias e sinalize baixa confiança. Se precisar raspar fontes com anti-bot (improvável), só então avalie Bright Data/Apify. Se a equipe não tiver engenharia de dados, considere Kondado para centralizar no warehouse — mas a coleta das fontes eleitorais ainda será custom.

## Caveats
- **Não é previsão.** Pesquisas medem intenção declarada no momento; agregar reduz ruído, não viés sistemático (vide erros de 2016/2020 nos EUA). Comunique incerteza sempre — siga o tom dos agregadores brasileiros.
- **A API DivulgaCandContas não é oficial nem documentada** e pode mudar/cair; prefira os downloads em massa.
- **Apuração em tempo real 2026 ainda não tem specs finais** — dependem da audiência pública de julho/2026; planeje com base em 2022/2024 mas mantenha flexibilidade.
- **PesqEle web tem anti-bot**; o caminho confiável é o CSV em massa, não scraping.
- **Restrições de pesquisa**: o TSE pode suspender/ocultar pesquisas por decisão judicial (ex.: a AtlasIntel BR-06939/2026 foi suspensa por liminar do ministro Kassio Nunes Marques em 8 de junho de 2026) — seu pipeline precisa lidar com remoções.
- **Encoding Latin-1, federações vs. coligações, e mudanças de layout entre anos** exigem normalização defensiva.
- **WebSockets não funcionam em serverless** (Vercel) — não desenhe a arquitetura de tempo real assumindo que sim.