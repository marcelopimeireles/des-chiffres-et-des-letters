# Des chiffres et des lettres — Web Game

Jogo web inspirado no programa francês de letras e números, com interface
visual de estúdio e integração opcional com [Rive](https://rive.app).

**Estado:** protótipo ativo. A interface das quatro modalidades já existe.
A rodada de Letras permite escolher vogais e consoantes, revelar as peças e
jogar contra o relógio. A validação lexical funciona **offline**, com listas locais de inglês, português de Portugal e francês.
As modalidades Letras e Números já validam respostas no servidor, atribuem pontuações provisórias e revelam soluções; os duelos e a final ainda são protótipos.

- [Roadmap de desenvolvimento](ROADMAP.md)
- [Guia do estúdio e das animações Rive](docs/STUDIO-AND-RIVE.md)

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

Os ficheiros compilados vão para `server/dist` e `client/build`.
O conteúdo de `client/build` precisa ser servido por um host estático
num deploy de produção; `yarn start` no cliente inicia o servidor de
desenvolvimento, não um servidor de produção.

O GitHub Actions também executa testes e builds após alterações relevantes.

## 6. Rotas e funcionamento atual

| Rota da interface | Modalidade | Estado |
| --- | --- | --- |
| `/` | Estúdio / seleção | Interface disponível |
| `/letter-round` | Le mot le plus long | EN/PT-PT/FR, sorteio, léxicos locais, pontuação e soluções |
| `/number-round` | Le compte est bon | 0–4 placas grandes, editor de operações, solver exato/aproximado, pontuação e prazo no servidor |
| `/duel` | Les duels | Demonstração com desafio fixo |
| `/final-words` | Les mots de la fin | Demonstração com conjunto fixo |

Endpoints da API (`http://localhost:5000/api/game`):

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/letters` | Tiragem automática simples (compatibilidade) |
| POST | `/letters/draw` | Sorteia dez letras e fixa o idioma (en, pt ou fr); retorna `drawId` |
| POST | `/letters/validate` | Valida a palavra no servidor e atribui pontos por letra se válida |
| GET | `/letters/:drawId/solutions` | Revela as melhores palavras no léxico local após o fim da ronda |
| GET | `/numbers` | Sorteio legado, sem sessão, mantido por compatibilidade |
| POST | `/numbers/draw` | Cria ronda de 45s e escolhe quantidade de grandes placas |
| POST | `/numbers/validate` | Valida cálculo e atribui pontos no servidor |
| GET | `/numbers/:drawId/solutions` | Revela melhor solução após resposta ou expiração |
| GET | `/duel` | Desafio demonstrativo |
| GET | `/final` | Conjuntos demonstrativos |

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

O backend guarda em memória o sorteio, idioma, resposta e prazo. Não aceita
letras fornecidas pelo browser na validação; impede que o mesmo sorteio marque
pontos duas vezes. Os sorteios expiram após cinco minutos e perdem-se ao
reiniciar o servidor.

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

**Limitações:** faltam léxicos integrais de competição, regras finais e pontuação agregada de partida. O servidor verifica o limite de tempo da ronda de Letras,
mas a sessão está em memória e deve migrar para armazenamento persistente. O Rive é decorativo: as regras
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

A API guarda o sorteio e os resultados **em memória por cinco minutos**.
Para deployment com múltiplas instâncias serão necessários armazenamento
persistente e sincronização de tempo. Consulte
[Regras e endpoints do M3](docs/NUMBER-RULES.md).

## 7. Problemas comuns

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
