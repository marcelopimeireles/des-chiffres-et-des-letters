# M3 — Regras de Números e API

## Sorteio

`POST /api/game/numbers/draw` com corpo `{"largeCount":2}`.
O número de grandes placas deve ser um inteiro entre 0 e 4.
Grandes: 25, 50, 75, 100 (máximo uma de cada). Pequenas:
1–10 (duas de cada valor), sem substituição.
O servidor escolhe seis placas e o alvo inteiro 101–999.

Resposta:
```json
{
  "drawId": "<uuid>",
  "targetNumber": 617,
  "numbers": [75, 5, 9, 3, 2, 10],
  "largeCount": 1,
  "deadlineAt": 0,
  "playSeconds": 45
}
```
O exemplo é ilustrativo; `deadlineAt` real é timestamp Unix em milissegundos.

O endpoint anterior `GET /api/game/numbers` continua como sorteio
sem estado para compatibilidade com integrações antigas.

## Regras provisórias do motor

O motor é `server/src/domain/numbers.ts`, inteiramente testável sem Express.
- Apenas `+`, `-`, `*` e `/`, parênteses e placas sorteadas.
- Cada ocorrência física de uma placa pode ser usada no máximo uma vez.
- Todas as operações produzem valores inteiros estritamente positivos,
  incluindo cada cálculo intermédio. Divisões precisam ser exatas.
- É permitido usar menos de seis placas.
- Não há `eval` nem avaliação de JavaScript; a expressão é analisada por parser.
- Uma resposta válida (exata ou aproximada) conclui a ronda; inválidas
  permitem nova tentativa durante o prazo de 45 segundos.
- Pontuação **não oficial**, definida para o MVP: distância 0 dá 10 pontos,
  distância 1–5 dá 7, distância 6–10 dá 5, e maior dá 0.
- Não é garantido que a solução exata exista.

O solver usa programação dinâmica em todos os subconjuntos das seis placas,
e considera as duas ordens para subtração e divisão. Usa as mesmas regras do
parser. Retorna valor, distância, expressão, passos e índices das placas
utilizadas. As operações estão limitadas a valores seguros até 1.000.000.000,
acima do maior produto de seis placas do sorteio atual.

## Contratos HTTP

`POST /api/game/numbers/validate`:
```json
{"drawId":"<uuid>","expression":"(10+5)*8-3"}
```

- 200 `valid:true`: `score`, `value`, `distance`, `exact` e `solution`
  (caso o solver esteja disponível).
- 200 `valid:false`: `reason:"invalid_expression"`, `error`, `score:0`.
- 400 pedido inválido, 404 sorteio inexistente/expirado,
  409 prazo ou ronda já concluída.

`GET /api/game/numbers/:drawId/solutions`:
- Antes do fim: 409 (não revela a solução).
- Depois de responder ou terminar o prazo: `targetNumber`, `score`,
  `submittedValue` e `solution`.

O cliente mantém cronómetro visual e pede as soluções quando termina.
O servidor aplica o limite temporal a partir da criação do sorteio. Para
sincronização exata do relógio visível deve usar-se futuramente o
`deadlineAt` devolvido pelo servidor.

As rondas vivem na memória do processo por cinco minutos, sem persistência;
a migração para base de dados/Redis faz parte do M4.

## Testes

```bash
cd server
yarn test
cd ../client
CI=true yarn test --watchAll=false
yarn build
```

Os testes de integração HTTP verificam impedimento de spoilers, validação
de regras, proteção de duplo score e deadline do servidor.
