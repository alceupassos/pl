# Plano de Execução & Status do Sistema — Eleições 2026

> Última atualização: **2026-10-04T06:45:00-03:00** — Executado no **Gemini 3.8 Flash**

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
| `[x]` | **11. Disclaimer TSE & Uso Interno** | Aviso legal atualizado: uso restrito interno de partidos políticos + conformidade com resoluções do TSE sobre IA (Res. 23.610/2019 e 23.755/2026). | [legal-text.ts](file:///Users/alceupassos/angra/sostenes/lib/legal-text.ts), [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx) |
| `[x]` | **12. Mapa do Brasil Colorido & Hover Clicado** | Mapa SVG do Brasil colorido com paleta viva por regiões, efeito luminoso `:hover` e `.on` idênticos ao clique, seleção imediata de estado ao clicar. | [brazil-map.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/brazil-map.tsx) |
| `[x]` | **13. Domínio Espelho politica.angra.io** | Configurado Nginx com proxy_pass porta 3080 e certificado SSL HTTPS emitido via Certbot no servidor `169.58.71.28`. | `/etc/nginx/sites-available/politica.angra.io` |
| `[x]` | **14. Menu de Escolha de Partido & Cores** | Seletor rápido de partidos no Header e modal de destaque, com cores oficiais de cada agremiação (`COR_PARTIDO`) refletidas nos candidatos. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css) |
| `[x]` | **15. Mini Mapa de Andamento por Cargo & UF** | Componente interativo com seletor de cargo (Presidente, Governador, Senado, Dep. Federal, Dep. Estadual), % de urnas apuradas por estado, escala de calor e clique para troca rápida de UF. | [mini-mapa-pleito.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/mini-mapa-pleito.tsx), [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx) |
| `[x]` | **16. Deploy em Produção** | Sincronização e publicação no servidor `169.58.71.28` (`/opt/pl`), build verificado e recarga do PM2 `pl`. | — |
| `[x]` | **17. Scroll Vertical Livre & Todos Candidatos** | Removido corte `.slice(0, 18)`, exibindo 100% dos candidatos de todos os estados (SP, PI, RJ, etc.), scroll vertical suave por mouse/touch/teclado (setas cima/baixo), busca rápida e remoção de barra duplicada de urnas apuradas. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css) |
| `[x]` | **18. Redesign do Mini Mapa & Mobile** | Novo design glassmorphism do Andamento do Pleito com filtro por Região (Todas, Sudeste, Sul, Nordeste, Norte, Centro-Oeste), visualização detalhada com líderes, micro-barras de progresso, botão de fechar, proteção contra bloqueio por widgets e responsividade mobile touch-friendly completa. | [mini-mapa-pleito.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/mini-mapa-pleito.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css), [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx) |
| `[x]` | **19. Alinhamento de % dos Candidatos, Fotos & Municípios** | Alinhamento simétrico da altura dos cards na Vitrine (slots de % uniformes), correção da extração do SQ oficial nas fotos do TSE (eliminado falso match com ano), rotas dedicadas para Presidente (`6257/br`) e estados (`6259/${uf}`), fallback automático para foto remota, busca ativa de municípios do TSE no seletor de cidades e correção de encoding ISO-8859-1 nas notícias do rodapé. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css), [noticias.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/noticias.ts) |
| `[x]` | **20. Remoção de Barra 'Em Destaque', Ocultação de Bens e Correção Ticker/Municípios** | Removida completamente a barra inferior '★ EM DESTAQUE' (`PosicaoBar`), ocultado o valor de patrimônio/bens declarados (`R$ ... mi`) dos cards de candidatos, corrigida a acentuação e decodificação mojibake em todos os feeds RSS de notícias (UOL, Folha, G1, Estadão) e ativada busca instantânea e carregamento autônomo dos 224 municípios do Piauí e demais estados no `FiltroLocal`. | [pleitos-wall.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/pleitos-wall.tsx), [pleitos.css](file:///Users/alceupassos/angra/sostenes/app/telao/pleitos/pleitos.css), [noticias.ts](file:///Users/alceupassos/angra/sostenes/lib/telao/noticias.ts) |

---

## 🚀 Implementações Realizadas Nesta Etapa

### 1. Mapa do Brasil Colorido e Interativo
- **Cores por Estado/Região**: Cada UF recebeu uma coloração temática harmoniosa (Norte em tons esmeralda/turquesa, Nordeste em tons quentes âmbar/laranja/coral, Centro-Oeste em tons dourados/oliva, Sudeste em azul e cobalto, Sul em tons violeta e púrpura).
- **Hover Idêntico ao Clicado**: Ao passar o cursor, o estado recebe borda amarela brilhante (`stroke: #facc15`, `stroke-width: 3.5`), preenchimento branco com `drop-shadow` intenso e elevação, simulando instantaneamente o estado selecionado.
- **Seleção Direta**: Ao clicar em qualquer estado, a UF é selecionada e a apuração carrega os dados locais.

### 2. Cópia Ativa em `politica.angra.io`
- Criada configuração dedicada em `/etc/nginx/sites-available/politica.angra.io` no servidor `169.58.71.28`.
- Emitido certificado SSL Let's Encrypt para `politica.angra.io` com redirecionamento HTTPS automático.
- Resposta `HTTP/2 200` validada para ambos os domínios: `https://pl.angra.io` e `https://politica.angra.io`.

### 3. Menu de Partido e Cores Oficiais
- **Seletor Rápido no Header**: Dropdown nativo estilizado no topo do telão para troca instantânea de partido de foco.
- **Cor Oficial do Partido**: Substituída a paleta genérica para usar a cor oficial de cada legenda (`COR_PARTIDO`), como PL (`#1f5fbf`), PT (`#e2252b`), NOVO (`#f26522`), Republicanos (`#2a7de1`), PSD (`#f2a900`), etc.
- Os nomes dos candidatos e indicadores passam a irradiar a cor do partido selecionado.

### 4. Mini Mapa de Andamento do Pleito por Estado e Cargo
- Criado o componente [mini-mapa-pleito.tsx](file:///Users/alceupassos/angra/sostenes/components/telao/mini-mapa-pleito.tsx).
- Alternância entre 5 cargos: **Presidente**, **Governador**, **Senado**, **Deputado Federal** e **Deputado Estadual**.
- Escala de calor visual por % de urnas apuradas:
  - `0%`: Cinza escuro (aguardando início)
  - `1-50%`: Azul / ciano (apuração inicial)
  - `51-85%`: Âmbar / amarelo dourado (apuração avançada)
  - `86-99%`: Laranja (reta final)
  - `100%`: Verde esmeralda (totalização concluída)
- Tooltip com líder parcial e clique no badge do estado para navegar diretamente até ele.

### 5. Disclaimer Legal do TSE e Uso Interno Partidário
- Atualizado em [legal-text.ts](file:///Users/alceupassos/angra/sostenes/lib/legal-text.ts) e no rodapé do telão:
  - **Uso Estritamente Interno**: Indicação expressa de que o sistema é de uso confidencial e exclusivo de diretórios partidários, não aberto ao público em geral.
  - **Norma do TSE sobre IA**: Menção explícita às Resoluções TSE nº 23.610/2019 e 23.755/2026, com rotulagem de mídias sintéticas para fins analíticos internos e fonte oficial de apuração do TSE.

---

## 📋 Instruções do que Falta Fazer para Terminar no Gemini 3.8 Flash

1. **Download Contínuo de Fotos Oficiais TSE**:
   - Manter rodando o script de fotos para garantir 100% dos candidatos em cache local:
   ```bash
   node scripts/baixar-fotos-tse.mjs todas
   ```
2. **Monitoramento do Horário de Fechamento das Urnas (17h00)**:
   - Às 17h00 (horário de Brasília), o telão transita automaticamente de contagem regressiva para polling contínuo da API do TSE.
   - Testar chamadas em `/api/telao/apuracao?p=presidente&uf=br` e `/api/telao/nacional`.
3. **Verificação de Novos Partidos**:
   - Caso novas agremiações necessitem de cores personalizadas, registrar no mapa `COR_PARTIDO` em `components/telao/pleitos-wall.tsx`.

---

## 🛠️ Comandos Rápidos de Operação

### Iniciar Localmente:
```bash
npm run dev
```
- **Central Mobile**: `http://localhost:3000/c`
- **Telão de Pleitos TV**: `http://localhost:3000/telao/pleitos`

### Produção:
- **Telão TV**: `https://pl.angra.io/telao/pleitos` ou `https://politica.angra.io/telao/pleitos`
- **Central Mobile**: `https://pl.angra.io/c` ou `https://politica.angra.io/c`
