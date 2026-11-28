# Frontend

Frontend React servido e compilado com [Vite](https://vitejs.dev/).

## Comandos

Executar a partir da raiz do repositório:

```bash
yarn --cwd client install --frozen-lockfile
yarn --cwd client start
yarn --cwd client test
yarn --cwd client test:coverage
yarn --cwd client build
yarn --cwd client preview
```

O servidor de desenvolvimento fica disponível em `http://localhost:3000`.
O build de produção é gerado em `client/dist`.

## Ambiente

Use `VITE_API_URL` para apontar para o backend. Os assets opcionais do Rive
podem ser configurados com `VITE_RIVE_GAME_SRC` e
`VITE_RIVE_STUDIO_SRC`.

## Testes

Os testes unitários usam Vitest com jsdom e Testing Library. Os testes E2E
estão em `e2e/` e usam Playwright para os cenários desktop e mobile.
