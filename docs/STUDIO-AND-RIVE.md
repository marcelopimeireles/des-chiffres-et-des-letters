# Studio UI and Rive integration

The responsive front end offers a TV-studio-inspired home page and four round
screens. Rive is optional: without a .riv export, CSS provides the ambient
studio animation. The site does not bundle third-party show graphics/audio.

## Rive workflow

1. Open [rive.app](https://rive.app) and create an original studio scene.
2. Create a state machine `Studio` with three trigger inputs:
   - `intro`: hero opening / ambient lights
   - `draw`: new game draw
   - `success`: correct answer celebration
3. Export to `client/public/animations/studio.riv`.
4. Copy `client/.env.example` to `client/.env` and set
   `VITE_RIVE_STUDIO_SRC=/animations/studio.riv`.
5. Restart the React dev server.

The app loads the pinned Rive Canvas JS runtime from a CDN **only when**
a .riv URL is configured; this leaves existing npm/yarn lockfiles intact.
For offline production or a strict Content Security Policy, the runtime
should be bundled locally in a later dependency update. The animation
is decorative; essential game text and controls are accessible HTML.

**No .riv asset has been created or committed yet.** The current homepage
uses a CSS fallback until a custom Rive project is exported. When a .riv
is supplied, the game screens fire the `draw` and `success` triggers.

## What works now

- Responsive homepage and four navigable game screens.
- Shared tiles, studio scoreboard presentation and visual countdown timers.
- Numbers use a traditional number pool (including 25, 50, 75, 100).
- The numeric input is parsed safely without `eval`, and drawn numbers
  cannot be reused more often than they appear.
- Letter rounds now offer ten individual vowel/consonant choices, undo, and a
  balanced automatic preset. A server POST endpoint performs the draw.
- Letters are revealed sequentially using CSS; the round's 30-second timer
  begins after the last reveal and disables input when time expires.

## Explicit gameplay limitations

- Random number targets are not guaranteed to have an exact solution.
  The submitted numeric result is checked, not the order of operations.
- Letter proposals are checked only against available letters: **no French
  dictionary** or scoring has been implemented.
- Letter timing is currently client-side only, not authoritative on the server.
- Actual tile-reveal animations still use CSS until custom Rive assets exist.
- The Duel and Final Words API routes still serve prototype puzzles.
- Timers are visual and not yet enforced as a gameplay rule.

## Letters draw API

`POST /api/game/letters/draw` accepts exactly ten values from
`vowel` and `consonant` in `choices` and returns `letters` + `choices`.
Invalid input receives HTTP 400. The older `GET /api/game/letters` still
returns a balanced automatic draw for backward compatibility.

## Running locally

```sh
cd server && yarn && yarn dev
# in a second terminal
cd client && yarn && yarn start
```

Set `VITE_API_URL` in the client's environment for another backend.

## Suggested next steps

1. Export original animation artwork from Rive and polish scene timing.
2. Introduce interactive vowel/consonant drawing and per-tile reveals.
3. Add a French dictionary service, word validation and scorekeeping.
4. Extend numbers scoring with operation steps and possible solutions.
5. Implement real duel/finale challenges, sound settings and end-to-end tests.
