# Roadmap — Des Chiffres et des Lettres

> Atualizado em 23/11/2026. Planeamento incremental; os incrementos em branches de trabalho precisam de PR antes de entrar na master.
>
> **Objetivo:** transformar o protótipo React/TypeScript + Express num jogo web a solo,
> com apresentação televisiva original, animações Rive, regras verificáveis,
> pontuação e uma partida completa. Multijogador só depois da experiência a solo.
>
> **Estimativas:** sprints indicativas de 1–2 semanas, não datas de entrega nem
> compromissos. Reavaliar esforço após fechar regras e obter os assets Rive.

## 1. Estado atual (baseline)

| Componente | Estado | Nota |
| --- | --- | --- |
| React/TypeScript, Redux, Router, API Express | ✅ Implementado | Preservar e evoluir incrementalmente |
| Home com quatro modalidades, estilo estúdio, layout responsivo | ✅ Primeira versão | Refinamento visual ainda necessário |
| Tabuleiros e cronómetros | 🟡 Em evolução | Letras: escolha, revelação e prazo de resposta; outras rondas ainda só visual |
| Parser matemático seguro e motor de regras | ✅ Implementado | Números: +, −, ×, ÷; inteiros positivos, divisão exata e uso único das placas |
| Sorteio de seis placas e solver | ✅ Implementado | 0–4 placas grandes e alvo 101–999; solver exato ou melhor aproximação |
| Sorteio de letras interativo | 🟡 Em evolução | EN/PT-PT/FR, léxicos locais, prazo no servidor, pontos provisórios e solver; falta regras oficiais e persistência |
| Integração Rive por máquina `Studio` / `intro, draw, success` | 🟡 Ponte de código | **Ainda não existe asset `.riv`** |
| Duels / Final Words | 🟡 MVP jogável | Dois duelos validados no servidor e final 8×10 letras / 120s; regras provisórias |
| Pontuação, progressão de partida, regras de tempo | 🟡 Em evolução | M4: nove etapas (6 clássicas + 2 duelos + final), placar e retoma sem persistência de DB |
| CI com testes e build do cliente | ✅ Implementado | Ampliar cobertura |

## 2. Entregas por versão

| Marco | Prioridade | Objetivo de release | Estimativa |
| --- | --- | --- | --- |
| **M0 — Base técnica** | Concluído | UI televisiva inicial, rotas, API, parser sem `eval`, CI | Entregue |
| **M1 — Estúdio Rive** | P0 | Primeiras animações Rive reais e eventos ligados ao jogo | 1–2 sprints |
| **M2 — Letras jogáveis** | P0 | Tiragem, validação lexical e resultado correto | 1–2 sprints |
| **M3 — Números jogáveis** | P0 | Motor de regras, resolução e pontuação | 1–2 sprints |
| **M4 — Partida completa (v1)** | P1 | Sequência de rondas, duelos, final, pontuação agregada | 2–3 sprints |
| **M5 — Qualidade e lançamento (v1)** | P1 | Acessibilidade, testes E2E, som opcional, publicação | 1–2 sprints |
| **M6 — Competitivo (v2)** | P2 | Salas, 2 jogadores, sincronização, reconexão | 2–4 sprints |
| **M7 — Evolução** | P3 | Perfis, estatísticas, rankings, PWA/localização | A definir |

**MVP público:** M1 + M2 + M3 (modo a solo Letras/Números). **V1 completa:**
M4 + M5. Não antecipar multijogador nem contas para o MVP.

## 3. Backlog executável

### M1 — Estúdio e Rive [P0]

**Dependência:** produção/exportação de assets próprios no [Rive Editor](https://rive.app).

- [ ] Criar guia visual: paleta, tipografia, proporções, materiais das placas,
      painéis, hierarquia, transições e comportamento mobile.
- [ ] Produzir `studio.riv` original e uma state machine `Studio` com
      triggers `intro`, `draw` e `success`; preservar o fallback CSS.
- [ ] Construir primeiro a abertura do estúdio e o sorteio sequencial
      de placas (letras e números), sincronizados com eventos React.
- [x] Ligar o cronómetro à fase de jogo e bloquear submissão após o prazo em Letras.
- [ ] Repetir o modelo nas outras modalidades e validar relógio no servidor.
- [ ] Criar estados visuais: a sortear, a jogar, tempo esgotado, resposta,
      resultado correto/incorreto e transição entre rondas.
- [ ] Garantir `prefers-reduced-motion`, teclado, ecrãs pequenos e fallback
      se WebGL/runtime/asset falharem.
- [ ] Empacotar runtime Rive numa dependência versionada para produção;
      evitar dependência exclusiva do CDN e verificar CSP/licença dos assets.

**Aceitação:** há pelo menos uma cena `.riv` real no repositório; ao iniciar
uma ronda, as placas aparecem por ordem; resposta correta dispara a animação
`success`; conteúdo essencial continua acessível sem Rive.

### M2 — Le mot le plus long [P0]

**Dependências:** definir variante de regras e escolher lexicon francês com
licença compatível (uso comercial/redistribuição, se aplicável).

- [x] Permitir escolher vogal ou consoante dez vezes e oferecer tiragem automática de 5/5.
- [x] Validar no servidor a sequência de dez escolhas e revelar as letras por ordem.
- [x] Guardar temporariamente sorteio e idioma no servidor usando `drawId` (5 minutos, em memória).
- [ ] Adicionar `seed` e armazenamento persistente para auditabilidade/reinício do servidor.
- [x] Seletor de língua EN, PT-PT e FR com validação em léxicos locais offline.
- [x] Disponibilizar subconjuntos de léxicos locais e documentar fontes/licenças.
- [ ] Substituir subconjuntos por dicionários completos de competição, com revisão de direitos, flexões e lista de termos admitidos.
- [x] Validar no **servidor** idioma, letras utilizadas e existência no léxico offline.
- [x] Substituir a API remota por índices lexicais carregados em memória; nenhuma consulta externa necessária.
- [ ] Rever qualidade da curadoria e proveniência dos dados antes de uso comercial.
- [x] Calcular comprimento da melhor palavra **do léxico instalado** e exemplos após o fim da ronda.
- [ ] Usar léxicos completos para garantir a melhor palavra possível em competição.
- [x] Aplicar prazo máximo (30 s mais revelação) no servidor e bloquear submissões/repetição de pontos.
- [x] Aplicar pontuação provisória de 1 ponto/letra e apresentar os melhores termos do léxico.
- [ ] Configurar barème regulamentar e guardar histórico de rondas persistente.
- [x] Testes de acentos, letras repetidas, palavras inválidas e limites de tempo no domínio.
- [ ] Testes completos de integração e acessibilidade em browsers reais.

**Aceitação:** uma resposta só recebe pontos quando pode ser formada com o
tiragem **e** consta do dicionário aprovado; soluções e pontuação são
reprodutíveis com um `seed` de sorteio.

### M3 — Le compte est bon [P0]

**Dependência:** fechar regras numéricas da edição/modo escolhido.

- [x] Configurar 0–4 placas grandes, seis placas com multiplicidade e alvo 101–999.
- [ ] Adicionar seed/armazenamento persistente para sorteios reproduzíveis entre sessões.
- [x] Implementar motor matemático puro e parser seguro no servidor, separado da UI, com uso único de cada placa.
- [x] Definir regras provisórias: resultados intermédios inteiros positivos, divisões exatas, sem zero.
- [x] Solver por subconjuntos de placas, procura solução exata ou melhor aproximação sem exigir solução exata para todos os sorteios.
- [x] Editor de cálculo passo a passo, botão desfazer, alternativa de expressão livre, e relógio de 45s.
- [x] Aplicar pontuação provisória por distância: 10 / 7 / 5 / 0, e revelar solução após o fim.
- [ ] Rever pontuação e regras para edição televisiva selecionada.
- [x] Testar repetição de placas, precedência, resultados intermédios, empate, solver e contrato HTTP.
- [ ] Executar testes E2E em browsers e perfis de desempenho para sorteios difíceis.

**Aceitação:** os cálculos são validados pelo motor de regras (não por
`eval`); solver e validador concordam; a pontuação e o tempo são auditáveis.

### M4 — Jogo completo e pontuação [P1]

- [x] Implementar progressão de partida a solo: configuração → ronda ativa → revisão → próxima → resultado final.
- [ ] Adicionar estados explícitos de transições animadas e apresentação Rive.
- [ ] Consolidar Redux para estado de sessão e apresentação;
      guardar dados determinísticos da ronda no domínio/servidor.
- [x] Configuração inicial a solo de idioma e número de grandes placas, com seis rondas alternadas.
- [ ] Adicionar nomes, seleção de variantes oficiais, dificuldade e sequências personalizáveis.
- [x] Duelo de anagrama e cálculo mental com resposta verificada no backend, sorteio e deadline.
- [ ] Evoluir duelos conforme o formato oficial escolhido.
- [x] Final de oito anagramas completos, 120s globais, validação no léxico e 10 pontos por palavra.
- [ ] Ajustar a final ao formato e às regras de competição selecionados.
- [x] Criar placar acumulado, histórico de respostas e ecrã de resultado final do modo solo.
- [ ] Acrescentar transições Rive reais entre provas e apresentação oficial.
- [x] Guardar `matchId` no localStorage e retomar estado e deadline reais no servidor após refresh.
- [ ] Persistir rondas/partidas no backend além da memória para sobreviver a deploy e várias instâncias.

**Aceitação parcial (M4 MVP):** jogador conclui nove etapas (6 clássicas,
2 duelos, final 8×10 letras) com soma validada no servidor. Regras oficiais,
barème definitivo, persistência e transições Rive ainda estão pendentes.

### M5 — Qualidade, distribuição e observabilidade [P1]

- [ ] Acrescentar testes de domínio, contratos API e E2E
      (Letras, Números, Duelo, Final e navegação).
- [ ] Testar desktop, tablet, telemóvel, teclado e leitor de ecrã;
      considerar WCAG 2.2 AA como objetivo.
- [ ] Sons opcionais com mute visível, sem autoplay inesperado;
      verificar direitos dos efeitos sonoros e da identidade gráfica.
- [ ] Medir tempo de carregamento de `.riv`, consumo de memória
      e desempenho em dispositivos modestos; preload apenas quando útil.
- [ ] Uniformizar validação de entrada, tratamento de erros, logs,
      CI backend/frontend e configuração de ambientes.
- [ ] Configurar publicação de frontend e API com variáveis de ambiente,
      CORS restrito e monitorização de falhas.
- [x] Documentar instalação, desenvolvimento, testes, build e integração Rive no README.
- [ ] Completar documentação de deployment e processo de release.

**Aceitação:** pipeline verde, build publicável, jogo funcional sem Rive,
sem regressões graves de acessibilidade e com documentação de deployment.

### M6 — Dois jogadores / multijogador [P2]

- [ ] Começar com duelo local/hot-seat antes de comunicação em rede.
- [ ] Introduzir salas privadas e ligação em tempo real (WebSocket ou similar).
- [ ] Tornar o servidor autoritativo para sorteio, relógio, respostas,
      pontuação e prevenção de repetição de pedidos.
- [ ] Tratar reconexão, desistência, latência, relógios e empates.
- [ ] Testar duas sessões em paralelo, incluindo redes instáveis.

**Aceitação:** dois browsers disputam a mesma partida com estado consistente.

### M7 — Opcional / longo prazo [P3]

- [ ] Perfis, histórico, estatísticas e rankings.
- [ ] Partidas diárias e desafios partilháveis.
- [ ] PWA, modo offline (se o léxico/licenças e assets permitirem).
- [ ] Localização da interface, sem misturar dicionários de idiomas distintos.
- [ ] Painel editorial para regras, dificuldades e novas modalidades.

## 4. Arquitetura proposta (sem reescrever o projeto agora)

```text
client/src/
  components/
    studio/       # RiveScene, transições, fallback, painéis
    game/         # TileRack, CountdownClock, Scoreboard
  features/
    letters/      # seleção, entrada, feedback
    numbers/      # cálculo passo a passo, UI
    match/        # fluxo de partida
  services/       # contratos com a API
  redux/          # estado de sessão/apresentação

server/src/
  domain/
    letters/      # sorteio, validação lexical, soluções
    numbers/      # regras e solver matemático
    match/        # rondas, tempo e pontuação
  controllers/    # HTTP (camada fina)
  routes/
  data/           # léxico licenciado / índices quando possível
```

A estrutura é **alvo**, não uma migração já executada. Não substituir CRA
ou o estado global apenas por moda: avaliar Vite, versão do TypeScript e
runtime Rive depois de estabilizar o MVP e medir impacto.

**Regra central:** o Rive apresenta a animação, mas não decide pontuação,
tempo real ou validade das respostas. O domínio do jogo é testável sem DOM.

## 5. Decisões pendentes que bloqueiam regras

1. **Edição de referência:** regras clássicas ou outra temporada/formato
   do programa francês? Duração, escolha de placas e sistema de pontos
   podem variar; documentar a variante implementada.
2. **Lexicon:** selecionar a fonte oficial/aberta e definir licenças,
   formas verbais, acentos, nomes próprios e variantes regionais.
3. **Estilo/licença:** referência estética à TV, porém logotipo,
   música, grafismos e efeitos originais ou devidamente autorizados.
4. **Modo de jogo:** MVP a solo, em francês, sem autenticação;
   multiplayer e perfis ficam fora do escopo inicial.

## 6. Ordem recomendada de issues

| Ordem | Issue sugerida | Prioridade | Bloqueada por |
| --- | --- | --- | --- |
| 1 | Definir ruleset, scoring e lexicon francês | P0 | — |
| 2 | Rive: estúdio + `Studio` state machine exportável | P0 | Assets próprios |
| 3 | Rive: ligação a sorteios, resultados e relógio | P0 | 2 |
| 4 | Letras: escolha de vogal/consoante + sorteio determinístico | P0 | 1 |
| 5 | Letras: API de dicionário, soluções e pontuação | P0 | 1, 4 |
| 6 | Números: motor de regras + solver + pontuação | P0 | 1 |
| 7 | Números: entrada por operações e feedback | P0 | 6 |
| 8 | Partida: fluxo, placar e relógio com regras | P1 | 3, 5, 7 |
| 9 | Duelos e final: conteúdo real e validação | P1 | 5, 8 |
| 10 | E2E, acessibilidade, som e deploy | P1 | 8, 9 |
| 11 | Multiplayer | P2 | V1 estável |

## 7. Definition of Done

Uma issue funcional está concluída apenas quando:

- [ ] Existe um comportamento demonstrável no navegador.
- [ ] A regra de negócio é testada sem interface e não duplica lógica no cliente.
- [ ] A API e os erros são claros; não se usa `eval` ou confiança exclusiva no browser.
- [ ] Teclado, viewport móvel e `prefers-reduced-motion` foram verificados.
- [ ] O jogo funciona se o Rive não carregar (se for uma funcionalidade essencial).
- [ ] Testes/CI e build passam; README ou docs relevantes foram atualizados.
- [ ] Existem critérios de aceitação observáveis, sem tarefas escondidas.

## 8. Incrementos implementados — Letras (M2) e Números (M3)

**Concluído nesta branch:**

- Escolha manual de 10 vogais/consoantes, desfazer, escolha automática (5 V / 5 C).
- Escolha de English, Português (Portugal) ou Français ANTES do sorteio; verificação offline e pontuação no backend.
- `POST /api/game/letters/draw` valida o padrão e sorteia as letras no servidor.
- Animação CSS de revelação sequencial de cada peça, com ponte Rive `draw` preservada.
- Cronómetro de 30 s começa depois da última peça e termina a rodada; a entrada de
  palavras é bloqueada depois do tempo. Há testes de UI e de domínio.
- README atualizado com guia de execução e desenvolvimento.

**Ainda não concluído / bloqueadores para a primeira vertical slice:**

1. Melhorar a qualidade dos léxicos locais existentes, confirmar a cadeia de direitos e selecionar dicionários de concurso completos.
2. Criar e exportar os assets reais `.riv` para `Studio` e placas.
3. Persistir sorteios e relógio no servidor e tornar a partida verificável (o `drawId` atual vive só em memória; o servidor já verifica o prazo).
4. ~~Somar pontos provisórios e apresentar soluções~~ concluído; integrar teste ponta a ponta, regras oficiais e placar entre rondas.

A interface **não atribui pontos** por palavras apenas formáveis. As animações
CSS disponíveis não devem ser confundidas com assets Rive finalizados.

Documentação complementar: [Studio e Rive](docs/STUDIO-AND-RIVE.md).


## 9. Incremento M3 — Le compte est bon (nesta branch)

- [x] `POST /api/game/numbers/draw` com controlo de 0–4 placas grandes e `drawId`.
- [x] `POST /api/game/numbers/validate` valida expressão no servidor, aplica prazo e atribui pontos provisórios uma vez.
- [x] `GET /api/game/numbers/:drawId/solutions` impede spoilers antes do fim, revela operações e aproximação ótima encontrada.
- [x] Solver puro com operações +, -, *, /, intermediários positivos inteiros e divisões exatas, sem `eval`.
- [x] Interface responsiva com construtor por etapas, desfazer, entrada manual e painel de resultados.
- [x] Testes unitários, testes HTTP, build do frontend, documentação e README.

**A completar:** regras oficiais da edição, experiência Rive real, persistência e placar de uma partida completa.


## 10. Incremento M4 — Partida solo (branch `feat/solo-match-m4-20261123`)

- [x] Sequência do MVP: Letras → Números → Letras → Números → Letras → Números.
- [x] API `POST /matches`, `GET /matches/:matchId` e `POST /matches/:matchId/next`.
- [x] Reutilizar sorteio, verificação, solver e pontuação dos motores do servidor.
- [x] Contador absoluto que não reinicia quando a página é atualizada, histórico e placar agregados no servidor.
- [x] Retomar por `matchId` no localStorage, sem atribuir confiança ao total enviado pelo browser.
- [x] Ecrã de resultado final a solo com seis respostas, incluindo rondas sem pontuação.
- [x] Testes do domínio, fluxo HTTP, interface React e documentação.

**Próximos passos:** criar pelo menos dois duelos realmente jogáveis, a final
de oito palavras e regras de campeonato; guardar partidas em base de dados
ou Redis antes de publicar um serviço multi-instância; criar assets Rive.


## 11. Incremento M4 — Duelos e final (branch `feat/duels-final-m4-20261123`)

- [x] Duelo de anagrama 6–8 letras com palavra verificada no léxico escolhido.
- [x] Duelo de cálculo mental (+, −, ×) validado no backend, sem fornecer resposta no sorteio.
- [x] Final 8×10 letras, cada tiragem com pelo menos uma solução no léxico, prazo global de 120s.
- [x] Endpoints de início, submissão, passar a palavra, consulta e solução protegida após término.
- [x] Integrar os duelos e a final na sequência da partida solo e no placar autoritativo.
- [ ] Concluir definição da edição oficial, revisão de dicionários, persistência multi-instância e animações Rive.
