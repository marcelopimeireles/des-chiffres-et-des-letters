# Deploy Vercel — Des chiffres et des lettres

O projeto utiliza **dois projetos Vercel** ligados ao mesmo repositório
`marcelopimeireles/des-chiffres-et-des-letters`. A separação evita configurar
um build frontend e backend Express dentro da mesma raiz. O deploy dos dois
projetos pode ser automático em cada push/PR depois da ligação ao Git.

## Arquitetura

```text
GitHub: des-chiffres-et-des-letters
 ├── client/    → Vercel "des-chiffres-web" (React 18, CRA)
 │                 GET /match, /number-round, /duel, etc.
 │                 REACT_APP_API_URL → HTTPS backend
 └── server/    → Vercel "des-chiffres-api" (Express Function)
                   GET/POST /api/game/*
                     ↕
                  Upstash Redis (REST; durável, keys por ambiente)
```

Vercel Functions não disponibilizam um filesystem persistente. A
persistência de `server/data/runtime/game-state.json` é utilizada apenas
no servidor tradicional. No ambiente Vercel, todas as chamadas ao jogo
passam pelo middleware `vercelRedisMiddleware`, que usa Redis:
bloqueio distribuído (SET NX PX), carregamento do snapshot, validação
e commit atómico via Lua EVAL antes de enviar o HTTP de sucesso. O
ficheiro local **não** é utilizado nas funções. Se o Redis não estiver
configurado, a API recusa pedidos do jogo com HTTP 503.

## 1. Criar Redis

Crie uma base Redis com persistência no [Upstash Console](https://console.upstash.com/)
ou em [Vercel Marketplace — Storage](https://vercel.com/marketplace?category=storage).
Copie a **REST URL HTTPS** e o **REST Token com permissão de escrita**.
Não use o token read-only. Nunca guarde tokens em `.env.example`, Git ou
variáveis `REACT_APP_*`.

Preferencialmente, coloque Vercel Function e Redis na mesma região para
reduzir latência. Preview e Production podem partilhar o mesmo Redis
**desde que utilizem keys diferentes**; bases separadas são melhores
para isolamento estrito.

## 2. Projeto da API

Em [Vercel → Add New → Project](https://vercel.com/new), importe o
repositório GitHub e configure:

| Campo | Valor |
|---|---|
| Project Name (exemplo) | `des-chiffres-api` |
| Root Directory | `server` |
| Framework Preset | `Express` |
| Install Command | `yarn install --frozen-lockfile` |
| Node.js Version | `22.x` |
| Entry point | `src/app.ts`, detetado automaticamente |
| Configuração | `server/vercel.json` |

O `server/vercel.json` inclui explicitamente
`data/dictionaries/**` no bundle para o lookup lexical não depender
de chamadas HTTP externas. Não usar `server/src/server.ts` como entry:
essa versão faz `app.listen` e persistência local, próprias de processos
de longa duração.

No painel de **Environment Variables** da API:

| Variável | Valor |
|---|---|
| `UPSTASH_REDIS_REST_URL` | `https://<seu-banco>.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST privado com escrita |
| `GAME_STATE_REDIS_KEY` | Exemplo produção: `dcel:production:v1` |
| `CORS_ORIGIN` | URL do frontend, sem barra final, ex. `https://des-chiffres-web.vercel.app` |

Defina tokens nos ambientes **Production** e **Preview** com keys
isoladas. Quando `GAME_STATE_REDIS_KEY` não está definido, o sistema
cria automaticamente keys por projeto Vercel/ambiente/branch. Ao definir
uma key manual, **não reutilize a mesma** em Preview e Production.

`CORS_ORIGIN` é opcional: quando omitido, a API aceita origens de
qualquer browser. Recomenda-se restringir a Production ao URL real
do frontend. Em Preview com domínios dinâmicos, é possível deixar a
variável ausente e ativá-la quando houver domínio fixo.

Publique a API e confirme:
```bash
curl https://<seu-projeto-api>.vercel.app/api/game/letters
```

A resposta deve ser JSON com dez letras. Se retornar HTTP 503 com
`storage_unconfigured`, faltam credenciais Redis. Um erro de léxico
indica que os ficheiros `data/dictionaries/**` não foram incluídos
corretamente no deploy. Consulte os logs em **Vercel → Logs**.

## 3. Projeto frontend

Importe **o mesmo repositório** como segundo projeto no Vercel:

| Campo | Valor |
|---|---|
| Project Name (exemplo) | `des-chiffres-web` |
| Root Directory | `client` |
| Framework Preset | `Vite` |
| Install Command | `yarn install --frozen-lockfile` |
| Build Command | `yarn build:vite` |
| Output Directory | `dist` |
| Node.js Version | `22.x` |
| Configuração | `client/vercel.json` |

**Environment Variables**, para Production e Preview:

```dotenv
VITE_API_URL=https://<seu-projeto-api>.vercel.app/api/game
```

A variável tem de apontar para a URL definitiva **HTTPS**, sem barra
final. O script `client/scripts/check-vercel-env.cjs` impede que
um build Vercel use acidentalmente a URL `localhost`.

Vite injeta `VITE_*` **no build**: se a URL mudar,
altere a variável e faça **Redeploy**. Nunca guarde tokens Redis no
frontend. O fallback em `client/vercel.json` mantém acessíveis
`/match`, `/duel`, `/final-words` e outras rotas após refresh.

## 4. Validação depois dos dois deploys

1. Abra `https://<web>.vercel.app/match` numa nova janela e recarregue.
   Deve continuar na página, sem erro 404 de SPA.
2. Inicie uma partida; confirme que surgem letras e cronómetro.
3. Faça uma tentativa, avance, e atualize a página: o score e deadline
   devem ser recuperados.
4. Repita usando uma janela anónima, para verificar a criação de
   sorteios por diferentes invocações da API.
5. Na API, valide que os erros de Redis devolvem HTTP 503, em vez de
   aprovar respostas que não podem ser gravadas.
6. Teste os lexicons EN/PT/FR e a final de oito palavras.
7. Observe logs Vercel e métricas Upstash para latência/quotas.
8. Teste novamente num deployment Preview sem reutilizar o estado
   da Production.

## 5. Limites operacionais

- O modelo atual mantém **um snapshot global** de todos os jogos,
  incluindo respostas secretas, no Redis. Cada pedido ao backend
  carrega o snapshot e as alterações fazem commit atómico sob lease
  distribuído. Adequado a um MVP com tráfego baixo/moderado; pode
  limitar throughput e gerar HTTP 503 temporários por contenção.
- O lock tem um TTL de 45 segundos e o máximo de função configurado
  é 30 segundos. Um commit com lock expirado é rejeitado para não
  sobrescrever pontuações mais recentes.
- O Redis guarda o snapshot por 2 horas desde a última alteração.
  Os TTL dos motores continuam 5 minutos por ronda isolada e
  1 hora por partida. Um erro de armazenamento devolve 503; a
  alteração pode ter ocorrido em memória e o cliente deve consultar
  o estado antes de reenviar.
- Os IDs ainda funcionam como identificadores de sessão sem
  autenticação. Não publicar competições com prémios sem uma
  camada de identidade, anti-abuso e auditoria.
- Não há SLA de performance nem teste de carga real; migrar
  o snapshot global para registros Redis/SQL por partida antes
  de tráfego elevado.
- Custos e quotas Upstash/Vercel variam com a utilização; consulte
  os dashboards dos fornecedores.

## 6. Desenvolvimento local

```bash
# Terminal 1
cd server
yarn dev

# Terminal 2
cd client
yarn start
```

Localmente o Express continua a usar o snapshot em ficheiro
[GAME-STATE-PERSISTENCE.md](GAME-STATE-PERSISTENCE.md), sem Redis
obrigatório. O CI valida TypeScript, testes Node, testes React e build.
Para testar preview pela CLI Vercel, ligue o projeto correspondente
e execute `vercel` dentro de `server/` ou `client/`.

**Deploy automático não é ativado por um ficheiro de configuração:**
é obrigatório associar o repositório à sua conta Vercel, provisionar
Redis e definir as variáveis privadas nos projetos.

## 7. Limite diário de deployments

Antes de publicar manualmente, execute o guard com um token Vercel mantido
fora do repositório:

```bash
VERCEL_TOKEN=... \
VERCEL_TEAM_ID=team_... \
VERCEL_DAILY_DEPLOY_LIMIT=2 \
node scripts/check-vercel-deploy-limit.cjs
```

No PowerShell:

```powershell
$env:VERCEL_TOKEN = '...'
$env:VERCEL_TEAM_ID = 'team_...'
$env:VERCEL_DAILY_DEPLOY_LIMIT = '2'
node scripts/check-vercel-deploy-limit.cjs
```

O limite padrão é de dois deployments por dia UTC. `VERCEL_PROJECT_ID` pode
ser definido para contar apenas um projeto. O script falha fechado quando o
token está ausente, a API não responde ou o limite já foi atingido. O token
não deve ser colocado no Git, em logs ou em variáveis expostas ao frontend.
