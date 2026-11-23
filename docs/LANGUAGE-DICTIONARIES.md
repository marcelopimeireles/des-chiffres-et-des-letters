# Multilingual dictionary validation — initial implementation

Available languages in the Letters round: **en** (English), **fr** (French),
and **pt** (Portuguese, served by **pt-BR** at the current provider).

## API contract

`POST /api/game/letters/draw`

```json
{"language":"pt","choices":["vowel","consonant","vowel","consonant","vowel","consonant","vowel","consonant","vowel","consonant"]}
```

Response: `{ "drawId": "<uuid>", "letters": ["A", "..."], "choices": [...], "language": "pt" }`.

`POST /api/game/letters/validate`

```json
{"drawId":"<uuid returned by draw>","word":"casa"}
```

- 200 `{ valid: true, reason: "accepted", language: "pt", word: "casa", source: "dictionaryapi.dev" }`
- 200 `{ valid: false, reason: "letters_mismatch" | "not_in_dictionary" | "invalid_format", language }`
- 400 malformed request; 404 expired/unknown draw; 503 remote dictionary inaccessible/rate limited.

**Trust boundary:** callers cannot substitute letters or language during word
validation; the server retrieves both by `drawId`. The in-memory draw store
expires after five minutes and is reset on server restart.

**Accent handling:** accents and ç consume the unaccented equivalent tile;
Œ and Æ consume two tiles; spaces, apostrophes, hyphens and punctuation are
currently excluded. The **actual accented spelling** is sent to the dictionary.

## Provider and limitations

The [Free Dictionary API](https://dictionaryapi.dev/) responds with word
entries for English `en`, French `fr` and Brazilian Portuguese `pt-BR`.
The server uses Node 20's built-in `fetch`, an HTTPS fixed host and a
4.5-second timeout. The dictionary does not need an API key and requires
server-side internet access. A 404 means not in the provider dictionary;
transient errors produce HTTP 503 and *do not* invalidate a word.

This is **not** the official competition dictionary. Coverage of flexions
and conjugations may vary. Portugal's **pt-PT** dictionary is not included.
No bundled word list or third-party definition content is redistributed.

The selector is locked for an active round. The client pauses the visual
timer while validating; the server has no authoritative 30s clock yet.
The app does not award points for a dictionary lookup or resolve optimal
words, pending licensed local dictionaries and final rules.

## Remaining work

- Pick redistributable, versioned offline dictionaries for en, fr, pt-PT
  (and optionally pt-BR). Confirm licensing and contest word rules.
- Add a cache and potentially a job to precompute valid anagrams.
- Align letters pools with competition frequency/rules per language.
- Use server-authoritative scoring/deadline with persisted sessions.
- Add live API integration tests and document provider availability/SLA.
