# Des chiffres et des lettres — Web Game

Jogo web inspirado no programa francês de letras e números, com interface
visual de estúdio e integração opcional com [Rive](https://rive.app).

**Estado:** protótipo ativo. A interface das quatro modalidades já existe.
A rodada de Letras permite escolher vogais e consoantes, revelar as peças e
jogar contra o relógio. A validação lexical funciona **offline**, com listas locais de inglês, português de Portugal e francês.
As modalidades Letras e Números já validam respostas no servidor e revelam soluções. O **modo Partida solo** agora reúne seis rondas alternadas com pontuação acumulada e resultado final. Dois duelos jogáveis e a final com oito anagramas também têm verificação no servidor.

- [Roadmap de desenvolvimento](ROADMAP.md)
- [Guia do estúdio e das animações Rive](docs/STUDIO-AND-RIVE.md)
- [Deploy na Vercel (React + Express + Redis)](docs/DEPLOY-VERCEL.md)
- [Plano de migração de CRA para Vite](docs/MIGRATION-CRA-VITE.md)

## Tecnologias

- **Frontend:** React 18, TypeScript, React Router, Redux Toolkit, CSS, Rive opcional.
- **Backend:** Node.js, Express e TypeScript, com API REST.
- **Dependências:** Yarn Classic (v1), usando os `yarn.lock` incluídos.
- **Desenvolvimento:** frontend em `http://localhost:3000`, API em `http://localhost:5000`.

## 1. Requisitos

Instale **Node.js 20.x** e **Yarn Classic 1.x**. Para disponibilizar Yarn, use
`corepack enable` se o Corepack estiver instalado, ou
`npm install -g yarn@1`.

Verifique a instalação:

```bash
node --version
yarn --version
```

> Evite misturar `npm install` com Yarn: o `package-lock.json` do frontend
> está desatualizado; use os ficheiros `yarn.lock`.

## 2. Instalar o projeto

```bash
git clone https://github.com/marcelopimeireles/des-chiffres-et-des-letters.git
cd des-chiffres-et-des-letters

cd server
yarn install --frozen-lockfile
cd ../client
yarn install --frozen-lockfile
cd ..
```

## 3. Executar em desenvolvimento

Abra **dois terminais**, ambos na raiz do repositório.

**Terminal 1 — API:**

```bash
cd server
yarn dev
```

O servidor inicia na porta **5000**, usando `ts-node-dev` para atualizar
automaticamente depois de alterações de código.

**Terminal 2 — aplicação React:**

```bash
cd client
yarn start
```

Abra **http://localhost:3000** no navegador. A API pode ser testada em
**http://localhost:5000/api/game/letters** ou
**http://localhost:5000/api/game/numbers**.

> `yarn start` no diretório `server` é para produção, e necessita de um
> `yarn build` prévio. No dia a dia utilize `yarn dev` na API.

## 4. Configurar ambiente e Rive (opcional)

O frontend funciona **sem conta ou ficheiro Rive**; o estúdio apresenta uma
animação CSS de substituição. Para configurar um ficheiro Rive próprio:

```bash
# Linux / macOS, na raiz do repositório
cp client/.env.example client/.env

# Windows PowerShell (alternativa)
# Copy-Item client/.env.example client/.env
```

Edite `client/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:5000/api/game
REACT_APP_RIVE_STUDIO_SRC=
```

Para utilizar a sua animação:

1. Crie uma cena no Rive Editor e exporte o ficheiro `studio.riv`.
2. Coloque o ficheiro em `client/public/animations/studio.riv`.
3. Defina `REACT_APP_RIVE_STUDIO_SRC=/animations/studio.riv`.
4. Reinicie `yarn start` no frontend.

A animação deve disponibilizar uma máquina de estados chamada `Studio` com
os triggers `intro`, `draw` e `success`.
O recurso `.riv` **não está incluído** atualmente; consulte a
[especificação de integração](docs/STUDIO-AND-RIVE.md).

A API usa `PORT=5000` por padrão, configurável por variável de ambiente.

### Persistência local do servidor

Por padrão, o Express guarda as rondas e partidas em
`server/data/runtime/game-state.json` (quando iniciado com `cd server`).
O diretório é criado automaticamente na primeira operação de escrita e
não é versionado no Git. O estado pode ser movido para um volume persistente:

```bash
cd server
GAME_STATE_FILE=/var/lib/des-chiffres/game-state.json yarn start
```

No Windows PowerShell:

```powershell
cd server
$env:GAME_STATE_FILE='C:\\game-data\\des-chiffres\\game-state.json'
yarn start
```

O ficheiro guarda **todo o estado necessário para retomar o jogo**, incluindo
as respostas ainda secretas de duelos e da final. Não o coloque em
`public/`, não o envie para o Git e proteja o acesso e os backups.
Cada alteração confirmada pela API é gravada num ficheiro temporário
privado e substitui o snapshot anterior por renomeação atómica.

Um reinício do **mesmo servidor** recupera as partidas e deadlines ainda
válidos, sem oferecer tempo adicional. As rondas isoladas expiram em
5 minutos; a sessão da partida expira em 1 hora. A persistência local
**não suporta várias instâncias a escrever no mesmo ficheiro**, discos
efémeros, nem constitui sistema de autenticação. Para alojamento com
réplicas, migrar para armazenamento transacional partilhado.

Se o ficheiro estiver corrompido ou numa versão incompatível, o servidor
recusa iniciar em vez de o sobrescrever. Guarde uma cópia antes de reparar
ou migrar a estrutura. Se uma gravação falhar durante uma operação, a API
responde HTTP 503; a ação pode ter sido aplicada em memória. Consulte o
estado da partida antes de repetir a submissão.

Consulte [Persistência e recuperação](docs/GAME-STATE-PERSISTENCE.md).

## Deploy na Vercel

O repositório está preparado para **dois projetos Vercel** a partir do mesmo
GitHub: `client/` para a SPA React e `server/` para a API Express. Em
Vercel, o estado das partidas usa Redis externo (Upstash) em vez de ficheiros
locais. **Sem as credenciais Redis, a API devolve HTTP 503 e não
inicia partidas efémeras.**

Antes de importar os projetos, consulte os passos completos em
[docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md). As variáveis obrigatórias
são `REACT_APP_API_URL` no frontend e `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` no backend. Recomenda-se também
`CORS_ORIGIN` e um `GAME_STATE_REDIS_KEY` isolado por ambiente.

O deploy público só fica ativo **depois** de associar o repositório à conta
Vercel, criar o Redis, inserir credenciais e publicar os dois projetos.
Ter os ficheiros `vercel.json` no Git não cria o projeto na plataforma.

## 5. Testes e build

**Testes e build do frontend:**

```bash
cd client
CI=true yarn test --watchAll=false
yarn build
```

No Windows PowerShell, para executar os testes uma vez:

```powershell
cd client
$env:CI='true'
yarn test --watchAll=false
```

**Testes e build do servidor:**

```bash
cd server
yarn test
yarn build
yarn start
```

Os ficheiros compilados vão para `server/dist` e `client/dist`.
O conteúdo de `client/dist` precisa ser servido por um host estático
num deploy de produção; `yarn start` no cliente inicia o servidor de
desenvolvimento, não um servidor de produção.

O GitHub Actions também executa testes e builds após alterações relevantes.

### Validação local

Antes de abrir um pull request, execute os testes do backend, frontend e E2E.
O BAT de validação local pode ser executado integralmente no Windows sem
iniciar deployments. A validação de referência passou com **81/81 testes**:

- backend: 42/42
- frontend: 33/33
- Playwright desktop: 3/3
- Playwright mobile emulado: 3/3

O job `windows-compatibility` do GitHub Actions repete a compilação e os
testes do backend e frontend num runner Windows. Os caminhos temporários do
Playwright usam o diretório temporário nativo do sistema, e a persistência
local grava o snapshot através de uma substituição atómica compatível com
Windows.

Os artefactos gerados em `server/dist`, `client/build`, relatórios E2E e
cobertura não devem ser adicionados ao Git.

## 6. Rotas e funcionamento atual

| Rota da interface | Modalidade | Estado |
| --- | --- | --- |
| `/` | Estúdio / seleção | Interface disponível |
| `/match` | Partie solo | Seis rondas de Letras/Números, dois duelos, final de oito palavras e placar |
| `/letter-round` | Le mot le plus long | EN/PT-PT/FR, sorteio, léxicos locais, pontuação e soluções |
| `/number-round` | Le compte est bon | 0–4 placas grandes, editor de operações, solver exato/aproximado, pontuação e prazo no servidor |
| `/duel` | Les duels | Anagrama ou cálculo mental, temporizado e validado pelo servidor |
| `/final-words` | Les mots de la fin | Oito anagramas de dez letras em 120 segundos |

Endpoints da API (`http://localhost:5000/api/game`):

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/letters` | Tiragem automática simples (compatibilidade) |
| POST | `/letters/draw` | Sorteia dez letras e fixa o idioma (en, pt ou fr); retorna `drawId` |
| POST | `/letters/validate` | Valida a palavra no servidor e atribui pontos por letra se válida |
| GET | `/letters/:drawId/solutions` | Revela as melhores palavras no léxico local após o fim da ronda |
| POST | `/matches` | Cria uma partida a solo com língua e número de placas grandes |
| GET | `/matches/:matchId` | Recupera ronda atual, resultados e total verificados pelo servidor |
| POST | `/matches/:matchId/next` | Avança depois de uma ronda concluída, ou encerra a partida |
| GET | `/numbers` | Sorteio legado, sem sessão, mantido por compatibilidade |
| POST | `/numbers/draw` | Cria ronda de 45s e escolhe quantidade de grandes placas |
| POST | `/numbers/validate` | Valida cálculo e atribui pontos no servidor |
| GET | `/numbers/:drawId/solutions` | Revela melhor solução após resposta ou expiração |
| GET | `/duel` | Endpoint legado demonstrativo |
| POST | `/duels/draw` | Cria duelo de anagrama ou cálculo mental |
| POST | `/duels/validate` | Confirma resposta de duelo e atribui 8 pontos |
| GET | `/duels/:drawId` | Estado público e prazo do duelo |
| GET | `/duels/:drawId/solution` | Revela solução após fim do duelo |
| GET | `/final` | Endpoint legado demonstrativo |
| POST | `/finale/draw` | Cria final com oito anagramas de dez letras |
| POST | `/finale/validate` | Valida palavra por índice (10 pontos) |
| POST | `/finale/skip` | Passa palavra sem pontos |
| GET | `/finale/:drawId` | Estado atual da final sem revelar soluções |
| GET | `/finale/:drawId/solutions` | Soluções após a final terminar |

Exemplo do corpo de `POST /letters/draw`:

```json
{
  "language": "fr",
  "choices": [
    "vowel", "consonant", "vowel", "consonant", "vowel",
    "consonant", "vowel", "consonant", "vowel", "consonant"
  ]
}
```

Exemplo de validação (substitua o UUID pelo `drawId` recebido):

```json
{ "drawId": "00000000-0000-4000-8000-000000000000", "word": "bonjour" }
```

O backend guarda o sorteio, idioma, resposta e prazo, persistindo o estado
num snapshot local antes de confirmar alterações. Não aceita letras fornecidas
pelo browser na validação; impede a atribuição de pontos duplicados. Os
sorteios expiram após cinco minutos, mesmo que o servidor reinicie.

**Dicionários locais por idioma:**

| Opção | Origem | Entradas aproximadas |
| --- | --- | --- |
| English (`en`) | Listas de palavras comuns em inglês, domínio público | 4.867 |
| Português (Portugal, `pt`) | Corpus de palavras portuguesas, fonte que declara domínio público | 27.248 |
| Français (`fr`) | Vocabulário de jogos do Mot Valide, CC BY-SA 4.0 | 11.158 |

O servidor lê ficheiros UTF-8 em `server/data/dictionaries`; não precisa de
consultar serviços externos. As listas são **subconjuntos** e não equivalem
a dicionários oficiais. A pontuação atual, **1 ponto por letra**, é provisória.
A melhor solução é calculada **dentro da lista instalada**, não necessariamente
a melhor palavra existente no idioma. Consultar a
[proveniência e licenças dos léxicos](server/data/LEXICON-SOURCES.md).

**Limitações:** faltam léxicos integrais de competição, regras finais e modos completos de duelos/final. O servidor verifica o limite de tempo da ronda de Letras,
com snapshots locais de uma instância; base de dados partilhada continua pendente. O Rive é decorativo: as regras
não devem depender da animação.

### M3 — Le compte est bon

A ronda de Números permite escolher **0–4 placas grandes** dentre 25, 50,
75 e 100, completando com placas pequenas 1–10 (até duas de cada).
É sorteado um alvo entre 101 e 999, que **pode não ter solução exata**.

O jogador dispõe de **45 segundos** para apresentar o cálculo. Pode construir
a expressão em etapas escolhendo dois valores disponíveis, uma operação e
clicando em **Ajouter une étape**. O resultado substitui esses valores no
conjunto disponível; **Annuler l’étape** reverte a operação. A entrada manual
de expressões com parênteses também está disponível.

As regras de números atualmente aplicadas pelo servidor são:

- Apenas `+`, `-`, `*` e `/`; todas as etapas geram inteiros positivos
  (não há subtrações negativas, zero ou divisões não exatas).
- Cada placa física pode ser usada no máximo uma vez; não é obrigatório
  utilizar todas as seis.
- A **primeira expressão válida** termina a ronda. As expressões inválidas
  podem ser corrigidas antes da expiração do prazo.
- Pontuação **provisória**: 10 pontos para resultado exato; 7 pontos para
  distância de 1–5; 5 pontos para distância de 6–10; zero fora desse intervalo.
- O solver procura soluções sobre todas as combinações das seis placas,
  incluindo aproximações se não existir solução exata.
- As soluções só são reveladas depois da ronda terminar (HTTP 409 enquanto ativa).

Exemplo dos novos endpoints da API:

```bash
# Criar uma ronda com duas placas grandes
curl -X POST http://localhost:5000/api/game/numbers/draw \
  -H 'Content-Type: application/json' \
  -d '{"largeCount":2}'

# Substituir o UUID pelo drawId obtido e usar as placas efetivas sorteadas
curl -X POST http://localhost:5000/api/game/numbers/validate \
  -H 'Content-Type: application/json' \
  -d '{"drawId":"00000000-0000-4000-8000-000000000000","expression":"(10+5)*8-3"}'
```

A API guarda sorteios por **cinco minutos** e recupera-os do snapshot local
após reiniciar. Para deployment com múltiplas instâncias será necessário
armazenamento transacional partilhado e sincronização de tempo. Consulte
[Regras e endpoints do M3](docs/NUMBER-RULES.md).

## 7. Partida a solo (primeiro incremento M4)

Na página **http://localhost:3000/match**, selecione o idioma de Letras
(EN, PT-PT ou FR) e a quantidade de placas grandes para Números (0–4).
Carregue em **Commencer la partie**. A partida decorre em nove etapas:

```text
Letras → Números → Letras → Números → Letras → Números
→ Duelo anagrama → Duelo cálculo mental → Final (8 palavras) → Resultado
```

A partida utiliza os mesmos validadores e solver do backend já usados
pelas modalidades isoladas; **não aceita pontos enviados pelo cliente**.
Em Letras, cada sorteio utiliza automaticamente cinco vogais e cinco
consoantes. Em Números, a modalidade de partida oferece a entrada manual
de expressão; o construtor de operações por etapas permanece na modalidade
isolada.

Cada ronda exige resposta antes do prazo do servidor. As soluções só
aparecem quando a ronda termina. O botão **Épreuve suivante** fica disponível
depois de responder ou deixar esgotar o tempo. A última ronda abre o painel
de pontuação final e a lista das seis respostas.

O identificador da partida é guardado no `localStorage`; a página pode ser
recarregada sem reiniciar o cronómetro. Os dados completos da partida
ficam numa sessão do servidor durante uma hora e são guardados em
**snapshot local durável**. Reiniciar a mesma instância não perde a partida;
escalar a API sem base de dados partilhada continua não suportado.

Exemplos de API:

```bash
curl -X POST http://localhost:5000/api/game/matches \
  -H 'Content-Type: application/json' \
  -d '{"language":"pt","largeCount":2}'

# Insira o matchId devolvido pela chamada acima
curl http://localhost:5000/api/game/matches/<matchId>

# Avança apenas depois de terminar a ronda atual
curl -X POST http://localhost:5000/api/game/matches/<matchId>/next
```

**Escopo atual:** partida solo de nove etapas, com dois duelos (30s cada,
8 pontos por resposta correta) e uma final de oito anagramas de dez letras
(120s globais, 10 pontos por palavra). As regras são originais e provisórias. A soma usa
os barèmes **provisórios** dos dois motores. Consulte
[Arquitetura e limitações do modo solo](docs/SOLO-MATCH.md).

## 8. Problemas comuns

- **Dicionário local indisponível:** confirme que os ficheiros
  `server/data/dictionaries/{en,pt,fr}.txt` estão presentes no servidor.
  As respostas HTTP 503 indicam erro de carregamento do léxico.
- **Letras ou números não carregam:** confirme que o servidor está em execução
  e que a URL em `REACT_APP_API_URL` aponta para `/api/game`.
- **Porta ocupada:** altere `PORT` na API ou liberte a porta 3000 do cliente.
- **`yarn start` falha no backend:** execute `yarn build` antes, ou utilize `yarn dev`.
- **Rive não aparece:** confira o caminho para o `.riv`, os nomes da máquina
  de estados e triggers e a conectividade com o runtime; a interface CSS
  continua disponível sem Rive.

## Contribuir

Utilize uma branch e abra um pull request com testes. As próximas prioridades
estão detalhadas em [ROADMAP.md](ROADMAP.md).

A interface é uma interpretação original inspirada em jogos televisivos.
Não estão incluídos grafismos, músicas ou animações oficiais licenciadas.

## Duelos e final — regras do protótipo

As provas individuais podem ser iniciadas em `/duel` e `/final-words`.
A API gera desafios sem enviar a resposta esperada; as soluções só ficam
disponíveis após responder corretamente ou terminar o prazo.

Os duelos atuais são um **anagrama de 6–8 letras** e um **cálculo mental
com +, − ou ×**, ambos de 30 segundos e 8 pontos por resposta correta.
A final seleciona oito palavras de **10 letras**, garantindo pelo menos
uma resposta no léxico local para cada tiragem. O participante dispõe de
120 segundos globais, podendo acertar cada palavra (+10) ou passar (+0).
Não são uma implementação fiel de uma edição oficial, e a curadoria do
léxico continua limitada à base atualmente instalada. Consultar
[regras dos desafios](docs/CHALLENGES.md).
