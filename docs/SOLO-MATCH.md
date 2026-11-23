# Solo match (M4 slice)

This iteration introduces a **nine-stage solo match** with six rounds alternating
Letters and Numbers, followed by two real duels and an eight-anagram finale. These are provisional game rules, not official television competition formats.

## State transitions

```text
configuration
    → playing letters (30s + 2.3s reveal)
    → review
    → playing numbers (45s)
    → review
    → letters → numbers → letters → numbers
    → duel anagram (30s) → duel mental (30s)
    → final (8 words / 120s total)
    → finished (total + nine-entry history)
```

The player cannot advance while the current round is active. A valid
answer ends the round immediately, and a timeout ends it with zero points.
A wrong/invalid answer can be retried while the round is still active. The finale also allows skipping each word with zero points.
A repeated valid answer cannot score twice.

The language and large-tile count are set at match creation. Letter draws
are **automatic 5 vowels / 5 consonants** in this mode; standalone Letters
continues to offer individual vowel/consonant choices. Numbers match mode
uses free-form arithmetic expressions; the dedicated Numbers page offers
the visual step-builder.

## Routes

Under `/api/game`:
- `POST /matches` with `{"language":"fr","largeCount":2}`: create match,
  server creates the first Letters round; responds HTTP 201 with snapshot.
- `GET /matches/:matchId`: retrieve match snapshot and server-verified score.
- `POST /matches/:matchId/next`: advance after a completed/expired round.
  Responds HTTP 409 while a round is active. After the ninth stage, returns a
  finished snapshot.

A snapshot includes `matchId`, `language`, `largeCount`, `totalRounds`,
`currentIndex`, `status`, `totalScore`, `history`, and `current`.
The current round contains its own `drawId`, deadline and tiles/target.
Users answer using existing `POST /letters/validate` or
`POST /numbers/validate` with the linked drawId; these controllers
notify the match store when a response is scored. **No endpoint accepts
score, answer validity or target from the client for a match.**

## Persistence / security boundaries

- `server/src/domain/matches.ts` stores up to 300 matches in memory, with a
  1-hour TTL. A versioned on-disk snapshot now restores that state after a restart.
- Individual round stores have their existing 5-minute TTL; once a result
  is resolved, the match freezes the score and answer in its own record.
- After the round deadline, matches capture a timeout at zero score.
- Browser stores **only the opaque match ID** in localStorage, then reloads
  the authoritative state from the API. No cookies or accounts yet.
- On page refresh, the clock uses an **absolute server deadline**; it cannot
  be restarted by refreshing the UI.
- The match ID currently acts as a bearer identifier. There is **no
  authentication**, so don't present this as suitable for competitive play.
- A versioned private snapshot survives a single Express process restart,
  including the active deadline and recorded scores. Replica concurrency and
  ephemeral disks are **not** supported; see
  [GAME-STATE-PERSISTENCE.md](GAME-STATE-PERSISTENCE.md).
- A "quit match" action clears the browser's pointer but doesn't yet revoke
  the server-side match.
- Scoring rules remain provisional and independent of any historical
  edition's official rulebook.

## Tests

```bash
cd server && yarn test
cd ../client && CI=true yarn test --watchAll=false && yarn build
```

Tests cover sequential rounds, rejected advances, authoritative score
carryover, expiry, API integration, resume and final score UI.

## Remaining M4 work

Real duel modes, final-eight mode with lexical scoring, configurable edition
rules, shared persistence in a database/Redis, cancellation/revocation, names,
accessible Rive transitions and two-player play.
