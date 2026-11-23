# M4 — Playable duels and eight-word finale

These are **original provisional gameplay rules**, not a claim to reproduce
any particular television edition.

## Duels

`POST /api/game/duels/draw` with `{ "kind":"anagram" | "mental", "language":"fr" }`.

- **Anagram:** scrambled full-length 6–8-letter term from the selected local
  lexicon. The player must use every letter. Any complete anagram that exists
  in the local lexicon is accepted; other entries can be valid if the same
  letters form a different word.
- **Mental:** basic arithmetic with two server-generated operands and
  operator +, −, or ×. Enter the integer result.
- Both: 30s from draw creation, 8 points for a correct answer, 0 otherwise.
  Incorrect submissions can be retried before expiry; first correct answer
  finishes the duel and makes subsequent submissions return HTTP 409.
- No secret answer is sent in the draw or status response.
- `POST /api/game/duels/validate`: `{ "drawId":"<uuid>","answer":"..." }`
- `GET /api/game/duels/:drawId`: challenge/status/deadline.
- `GET /api/game/duels/:drawId/solution`: HTTP 409 while active, otherwise
  server's original intended word or numeric answer.

## Finale

`POST /api/game/finale/draw` with `{ "language":"fr" }`.

The server selects **eight unique entries that use ten letter tiles** from
the language's local dictionary, shuffles each entry's letters and sends
only the current draw. This guarantees at least one solution for each
ten-letter set *in the installed lexicon*.

- **120 seconds global** for all eight words; refreshing the page does not
  reset the backend's deadline.
- **10 points per accepted word**. The word must use all ten tiles and
  exist in the selected local lexicon.
- Incorrect submissions don't advance. Skip advances to the next item and
  earns 0 points. The finale ends after eight accepted/skipped words or
  when the global deadline expires.
- `POST /api/game/finale/validate`: `{ "drawId":"<uuid>","index":0,"word":"..." }`
- `POST /api/game/finale/skip`: `{ "drawId":"<uuid>","index":0 }`
- `GET /api/game/finale/:drawId`: public state and **only the current**
  anagram; no future word, solution or server-internal target is included.
- `GET /api/game/finale/:drawId/solutions`: HTTP 409 until the finale
  finishes, then all target words, submitted answers and per-item scores.
- Index validation prevents replay or out-of-order scoring.

## Integration with the solo match

A match uses six existing Letters/Numbers rounds, then an anagram duel,
a mental duel and a finale. Each of the nine stages receives a server
`drawId`. The `soloMatchStore` reads authoritative score from the four
round stores. It never accepts score or validity values from a browser.

All stores are currently in-memory only (round TTL five minutes, match TTL
one hour); server restart clears the session. No authentication, rewards,
commercial dictionaries or official competition rules are implemented yet.
