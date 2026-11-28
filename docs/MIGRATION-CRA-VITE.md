# Migração do frontend de CRA para Vite

## Motivo

O frontend usa Vite. A migração preservou as rotas, os testes, as variáveis
de ambiente da Vercel e o fallback SPA.

## Estado atual

- React 18 + TypeScript 4.9.
- Entrypoint: `client/src/index.tsx`.
- Testes: Vitest através de `yarn test`.
- Build: Vite através de `yarn build`.
- Variável pública: `VITE_API_URL`.
- Assets públicos referenciados por `%PUBLIC_URL%`.
- Vercel serve `client/dist` e aplica fallback para `index.html`.

## Plano por fases

1. Adicionar Vite e `@vitejs/plugin-react`. Concluída.
2. Criar `client/vite.config.ts` com suporte aos assets públicos e proxy local.
   Concluída.
3. Criar `client/index.html` equivalente ao `public/index.html`. Concluída.
4. Migrar `REACT_APP_*` para `VITE_*` através de um adaptador de ambiente.
   Concluída; `VITE_*` é o contrato oficial e `REACT_APP_*` fica apenas como
   fallback de compatibilidade até atualizar as variáveis existentes na Vercel.
5. Migrar Jest para Vitest sem reduzir os 15 suites e 44 testes atuais.
   Concluída.
6. Atualizar `client/vercel.json`, scripts E2E e workflows CI para `dist`.
   Concluída.
7. Remover `react-scripts`, configurações CRA e scripts temporários depois de
   validar frontend, Windows, Playwright e dois previews Vercel. Concluída.

## Critérios de aceitação

- `yarn install --frozen-lockfile` funciona em Linux e Windows.
- `yarn test` mantém todos os testes verdes.
- `yarn build` produz `client/dist` sem warnings bloqueantes.
- `/`, `/match`, `/duel` e `/final-words` funcionam após refresh direto.
- `VITE_API_URL` é o nome oficial no deployment Vercel; o fallback legado só
  existe para não quebrar previews com variáveis antigas.
- Playwright desktop/mobile e o job Windows passam no CI.
- Não há regressão no runtime Rive, nos assets públicos ou no fallback SPA.

## Riscos

- Mudança do nome das variáveis públicas pode quebrar previews existentes.
- Vitest e Jest têm diferenças em timers, mocks e cobertura.
- A saída `dist/` precisa ser alinhada com os dois projetos Vercel.
- A migração deve ser dividida em PRs pequenos para facilitar rollback.
