# Des chiffres et des lettres — Web Game

Jogo web inspirado no programa francês de letras e números, com interface
visual de estúdio e integração opcional com [Rive](https://rive.app).

**Estado:** protótipo ativo. A interface das quatro modalidades já existe.
A rodada de Letras permite escolher vogais e consoantes, revelar as peças e
jogar contra o relógio. A validação lexical por idioma já funciona via API pública (requer internet).
A pontuação completa, os duelos e a final ainda não estão implementados como partidas completas.

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
| `/letter-round` | Le mot le plus long | Idiomas EN/PT/FR, sorteio e validação lexical via servidor |
| `/number-round` | Le compte est bon | Sorteio, calculadora segura e comparação com o alvo |
| `/duel` | Les duels | Demonstração com desafio fixo |
| `/final-words` | Les mots de la fin | Demonstração com conjunto fixo |

Endpoints da API (`http://localhost:5000/api/game`):

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/letters` | Tiragem automática simples (compatibilidade) |
| POST | `/letters/draw` | Sorteia dez letras e fixa o idioma (en, pt ou fr); retorna `drawId` |
| POST | `/letters/validate` | Valida palavra no dicionário e nas letras do sorteio identificado |
| GET | `/numbers` | Sorteia seis placas e o alvo |
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

O backend guarda temporariamente o sorteio e o idioma; **não** aceita letras
escolhidas pelo cliente durante a validação. Os sorteios ficam em memória por
até cinco minutos e são perdidos se o servidor reiniciar.

**Dicionários por idioma:** English usa `en`, Français usa `fr` e
Português usa a fonte `pt-BR` (Brasil) da
[Free Dictionary API](https://dictionaryapi.dev/). A consulta exige internet
no **backend**; indisponibilidade ou limite de chamadas gera HTTP 503,
não uma falsa resposta "palavra inválida". Nem todas as flexões e palavras
admitidas em concursos televisivos estão cobertas por essa fonte, e português
europeu ainda exige um léxico `pt-PT` próprio.

**Limitações:** faltam melhor solução, pontuação e regras de um concurso
completo; os tempos são controlados pelo cliente e o backend só guarda
sorteios temporários. O Rive é decorativo: as regras
não devem depender da animação.

## 7. Problemas comuns

- **Validação de palavra falha:** o backend precisa de acesso a `api.dictionaryapi.dev`;
  verifique a ligação de rede. Se receber HTTP 503, repita a consulta.
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
