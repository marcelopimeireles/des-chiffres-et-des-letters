# Roadmap — Des Chiffres et des Lettres

> Atualizado em 23/11/2026. Planeamento incremental. O trabalho na branch de desenvolvimento continua pendente de merge.
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
| Parser matemático seguro; impede reutilização de placa | ✅ Implementado | Não equivale a validar todas as regras da modalidade |
| Sorteio de seis placas com placas grandes | ✅ Implementado | Alvo aleatório pode não ter solução exata |
| Sorteio de letras interativo | 🟡 Incremento implementado | V/C individuais + sorteio automático 5/5; falta léxico e sorteio reproduzível |
| Integração Rive por máquina `Studio` / `intro, draw, success` | 🟡 Ponte de código | **Ainda não existe asset `.riv`** |
| Duels / Final Words | 🟡 Ecrãs demonstrativos | Dados fixos/provisórios no backend |
| Pontuação, progressão de partida, regras de tempo | ❌ Pendente | Não existe motor de partida completo |
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
- [ ] Adicionar `seed` de sorteio e persistência de sessão para auditabilidade e segurança.
- [ ] Integrar léxico francês indexado (normalização Unicode, acentos,
      plurais/flexões segundo a regra escolhida); excluir palavras não admitidas.
- [ ] Validar no **servidor** existência no léxico e multiplicidade das letras.
- [ ] Calcular tamanho, melhor palavra possível e exemplos de soluções
      após a revelação (não antes).
- [x] Impedir submissão após os 30 segundos de uma ronda de Letras (validação no cliente, ainda não autoritativa).
- [ ] Implementar pontuação, feedback lexical, tempo regulamentar configurável
      e histórico da ronda no servidor.
- [ ] Testar acentos, letras repetidas, maiúsculas, palavras inválidas e
      limites de tempo.

**Aceitação:** uma resposta só recebe pontos quando pode ser formada com o
tiragem **e** consta do dicionário aprovado; soluções e pontuação são
reprodutíveis com um `seed` de sorteio.

### M3 — Le compte est bon [P0]

**Dependência:** fechar regras numéricas da edição/modo escolhido.

- [ ] Tornar os sorteios reproduzíveis e configurar quantidade de placas
      grandes, universo das placas e intervalo do número alvo.
- [ ] Implementar motor matemático **puro**, separado da UI, para operações
      permitidas e uso único de cada placa.
- [ ] Decidir e aplicar regras de resultados intermédios
      (inteiros positivos, divisão exata, proibição de zero, etc.).
- [ ] Desenvolver solver para encontrar solução exata ou aproximação,
      sem exigir que todo sorteio admita resposta exata.
- [ ] Criar entrada passo a passo, com representação legível do cálculo,
      botão para desfazer, relógio e validação de cada operação.
- [ ] Pontuar segundo distância ao alvo e regra da edição; revelar
      exemplos de soluções quando a ronda terminar.
- [ ] Testar limites, números repetidos, parênteses, empate e performance.

**Aceitação:** os cálculos são validados pelo motor de regras (não por
`eval`); solver e validador concordam; a pontuação e o tempo são auditáveis.

### M4 — Jogo completo e pontuação [P1]

- [ ] Definir máquina de estados da partida:
      `lobby → draw → countdown → answer → reveal → scoring → next → finished`.
- [ ] Consolidar Redux para estado de sessão e apresentação;
      guardar dados determinísticos da ronda no domínio/servidor.
- [ ] Implementar configuração de partida: nome(s), edição/modo,
      tipo e sequência de rondas, dificuldade e tempo (quando permitido).
- [ ] Implementar pelo menos dois duelos reais com geração e solução
      verificáveis, substituindo o desafio estático existente.
- [ ] Implementar a final com oito tiragens, tempo global, validação de
      dicionário e pontuação própria.
- [ ] Criar placar permanente, transições Rive entre provas,
      resumo de respostas e ecrã de resultado final.
- [ ] Persistir localmente uma partida a solo, com retoma segura;
      definir quando um cronómetro continua ou expira após a pausa.

**Aceitação:** um jogador conclui uma partida do princípio ao fim sem
recarregar; o resultado final é a soma de rondas verificadas, sem pontos
provisórios.

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

## 8. Incremento em execução — Letras (M1/M2)

**Concluído nesta branch:**

- Escolha manual de 10 vogais/consoantes, desfazer, escolha automática (5 V / 5 C).
- `POST /api/game/letters/draw` valida o padrão e sorteia as letras no servidor.
- Animação CSS de revelação sequencial de cada peça, com ponte Rive `draw` preservada.
- Cronómetro de 30 s começa depois da última peça e termina a rodada; a entrada de
  palavras é bloqueada depois do tempo. Há testes de UI e de domínio.
- README atualizado com guia de execução e desenvolvimento.

**Ainda não concluído / bloqueadores para a primeira vertical slice:**

1. Escolher lexicon francês, regras oficiais e licença; validação por dicionário no servidor.
2. Criar e exportar os assets reais `.riv` para `Studio` e placas.
3. Persistir sorteios e relógio no servidor e tornar a partida verificável.
4. Somar pontos válidos, apresentar soluções e testar a experiência integral.

A interface **não atribui pontos** por palavras apenas formáveis. As animações
CSS disponíveis não devem ser confundidas com assets Rive finalizados.

Documentação complementar: [Studio e Rive](docs/STUDIO-AND-RIVE.md).
