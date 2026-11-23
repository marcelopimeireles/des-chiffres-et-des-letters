# Local dictionaries, scoring, best-word solver (M2)

The Letters round uses three **local UTF-8 lexicons**, no network lookup:
- `en` — English (subsets of common public-domain words);
- `pt` — Português (Portugal) (word list that claims public-domain status; provenance review needed);
- `fr` — Français (derived data CC BY-SA 4.0).

See [source credit and licensing](../server/data/LEXICON-SOURCES.md).
These are **limited local dictionaries**, not official Scrabble or TV show
dictionaries. The UI displays the number of local entries on results.

## API

### Create a draw

`POST /api/game/letters/draw`
```json
{"language":"pt","choices":["vowel","consonant","vowel","consonant","vowel","consonant","vowel","consonant","vowel","consonant"]}
```

Returns `drawId`, `language`, `letters`, `choices`, `deadlineAt`,
`revealDurationMs` (2300) and `playSeconds` (30).

### Submit an answer

`POST /api/game/letters/validate`
```json
{"drawId":"<uuid returned by draw>","word":"casa"}
```

- 200 accepted: `valid: true`, `score`, canonical `word`, `source:"local-lexicon"`,
  `solutions: {bestLength, bestWords, lexiconEntries}`;
- 200 not accepted: `valid: false`, `reason` (`invalid_format`,
  `letters_mismatch` or `not_in_dictionary`), `score:0`;
- 400 malformed payload;
- 404 unknown / expired `drawId`;
- 409 time expired or same draw already scored;
- 503 missing/corrupt local lexicon.

The server obtains letters/language from its own store. The **first valid
answer finishes the round**; subsequent answers cannot earn additional
points. One point is awarded per used tile, subject to a final scoring
ruleset. Server deadline is 30 seconds plus the 2.3-second tile reveal from
draw creation. In-memory draws expire after five minutes.

### Reveal at the end

`GET /api/game/letters/:drawId/solutions`

Returns `score`, `language`, `bestLength`, `bestWords`, and
`lexiconEntries` **only after a valid answer or deadline**. Returns 409
while the game remains active, to avoid spoiler leakage through this endpoint.
The example solutions are alphabetically sorted and capped to eight words.

The solver is a scan over the local lexicon. It checks the
multiplicity of each tile and maps accents/ligatures to the corresponding
unaccented tiles. Its result is exact **only inside the installed list**.

## Remaining work

- Confirm commercial rights for all data and adopt fuller, versioned
  official game dictionaries for all three languages.
- Persist match state/deadlines across server restarts and replicas.
- Pin the ruleset: point awards, repeat submissions, difficulty,
  allowable inflections, proper names, diacritics and long words.
- Use authoritative per-round times synchronized with the client
  (current timer is visual and server time is based on draw creation).
- Add browser-level E2E tests and scalable anagram indexing as needed.
