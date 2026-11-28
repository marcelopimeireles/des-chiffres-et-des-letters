# Migração do frontend de CRA para Vite

## Motivo

O frontend ainda usa `react-scripts` 5.0.1, baseado em Create React App,
que está descontinuado. A migração deve preservar as rotas, os testes, as
variáveis de ambiente da Vercel e o fallback SPA.

## Estado atual

- React 18 + TypeScript 4.9.
- Entrypoint: `client/src/index.tsx`.
- Testes: Jest através de `react-scripts test`.
- Build: `react-scripts build`.
- Variável pública: `REACT_APP_API_URL`.
- Assets públicos referenciados por `%PUBLIC_URL%`.
- Vercel serve `client/build` e aplica fallback para `index.html`.

## Plano por fases

1. Adicionar Vite e `@vitejs/plugin-react`, mantendo temporariamente os
   scripts CRA como fallback.
2. Criar `client/vite.config.ts` com `root` em `client`, alias de `src`,
   suporte aos assets públicos e proxy local para a API.
3. Criar `client/index.html` equivalente ao `public/index.html` e manter
   manifest, favicon e animações em `public/`.
4. Migrar `REACT_APP_*` para `VITE_*` através de um adaptador de ambiente;
   atualizar o script de validação Vercel e a documentação.
5. Migrar Jest para Vitest ou manter Jest explicitamente configurado, sem
   reduzir os 15 suites e 44 testes atuais.
6. Atualizar `client/vercel.json`, scripts E2E e workflows CI para `dist/`.
7. Remover `react-scripts`, configurações CRA e scripts temporários apenas
   depois de validar frontend, Windows, Playwright e dois previews Vercel.

## Critérios de aceitação

- `yarn install --frozen-lockfile` funciona em Linux e Windows.
- `yarn test` mantém todos os testes verdes.
- `yarn build` produz `client/dist` sem warnings bloqueantes.
- `/`, `/match`, `/duel` e `/final-words` funcionam após refresh direto.
- `REACT_APP_API_URL` não é aceito silenciosamente em produção depois da
  migração; a configuração Vercel deve usar a convenção escolhida.
- Playwright desktop/mobile e o job Windows passam no CI.
- Não há regressão no runtime Rive, nos assets públicos ou no fallback SPA.

## Riscos

- Mudança do nome das variáveis públicas pode quebrar previews existentes.
- Vitest e Jest têm diferenças em timers, mocks e cobertura.
- A saída `dist/` precisa ser alinhada com os dois projetos Vercel.
- A migração deve ser dividida em PRs pequenos para facilitar rollback.
