# M5 — Persistência e recuperação do estado (primeiro incremento)

A API já valida respostas, prazo e score no servidor. Este incremento torna
recuperáveis os motores existentes **de uma única instância Express**.

## Como funciona

No arranque de `server/src/server.ts`:
1. `GAME_STATE_FILE` define o ficheiro JSON de estado. Se ausente, usa
   `server/data/runtime/game-state.json` (ao iniciar em `cd server`).
2. Se existir, o sistema verifica a versão do schema e a estrutura dos
   registos **antes** de substituir os mapas de memória.
3. Reconstitui Letras, Números, Duelos, Final e Partidas, incluindo o índice
   que associa o `drawId` atual à partida.
4. Descarta rondas e partidas que já ultrapassaram os respetivos TTL;
   **não** reinicia deadlines nem redistribui pontos.

Depois de cada resposta HTTP bem-sucedida a um `POST /api/game/*`,
o backend serializa o estado completo (schema `version: 1`), cria
um ficheiro temporário privado no mesmo diretório, escreve e sincroniza
o conteúdo, e substitui o ficheiro anterior com `rename`.

A confirmação HTTP só é devolvida após a gravação. Em erro de disco,
a API devolve `503 state_save_failed`. A transação pode já ter alterado
o mapa em memória; o cliente deve consultar `GET /matches/:id` antes de
tentar outra vez, sobretudo após uma resposta válida.

Um ficheiro inválido, com versão desconhecida ou JSON truncado impede
o servidor de iniciar. O programa **não** limpa nem sobrescreve
automaticamente os dados para proteger resultados anteriores.

## Dados guardados

- Letras: `drawId`, escolhas, placas, idioma, deadline e resposta.
- Números: placas, alvo, expressões, score e melhor solução calculada.
- Duelos: desafio, resposta secreta, resposta dada e deadline.
- Final: todos os oito anagramas e respetivas soluções **secretas**,
  progresso, palavras resolvidas/passadas e pontuação.
- Partida: configuração, nove etapas, scores congelados, etapa atual e ID.

**O ficheiro contém segredos do jogo e identificadores que permitem
consultar partidas sem autenticação.** Não servir como ficheiro estático,
não adicionar ao controlo de versões, não partilhar com clientes. Criar
backup no volume privado com acesso limitado.

## Instalação e operação

```bash
cd server
yarn build
GAME_STATE_FILE=/var/lib/des-chiffres/game-state.json yarn start
```

Garanta um volume gravável **e persistente**, com acesso apenas à API.
Em container, monte um volume persistente em
`/var/lib/des-chiffres`. O diretório e o ficheiro são criados com modos
privados por omissão em sistemas POSIX.

Para recuperar depois de um reinício, basta reutilizar o mesmo volume:
o estado é carregado antes de `app.listen` e os tempos continuam com
base nos timestamps originais.

Para migrar de versão, faça backup do ficheiro e atualize o formato com
uma migração explícita. A versão 1 recusa schemas desconhecidos para evitar
descartar resultados silenciosamente.

## Testes

```bash
cd server && yarn test
```

Os testes cobrem serialização e restauração dos quatro motores e partidas,
recuperação de respostas e índices, prazos absolutos após restart,
expiração por TTL, ficheiros corrompidos/versões desconhecidas, e gravação
antes de confirmar o `POST /matches` HTTP.

## Limites da solução

- **Uma instância apenas.** Dois processos simultâneos ou várias réplicas
  com acesso ao mesmo ficheiro podem sobrescrever alterações concorrentes.
- Não existe transação distribuída, bloqueio entre processos ou cluster.
- Não substitui backup periódico, autenticação/autorização, controlo de
  sessões, proteção contra cheating e auditoria.
- Escrita síncrona de snapshot completo por operação: adequada a um MVP
  de baixo tráfego, não escalável como armazenamento primário.
- Ficheiros em storage efémero desaparecem ao criar novo container; use
  volume ou disco persistente.
- Uma falha durante a renomeação pode deixar um ficheiro temporário
  privado. A última versão completa mantém-se disponível.
- Para produção com escalabilidade horizontal, migrar para uma base de
  dados partilhada (Postgres ou Redis com durabilidade configurada) e
  transações/controlo de concorrência.
