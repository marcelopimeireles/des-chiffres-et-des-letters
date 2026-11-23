# Studio UI and Rive integration

## Goal

Turn the existing React game into a studio-inspired interface without coupling
game rules to presentation. This is an original interface inspired by the
lighting, scoreboards, typography and puzzle tiles of televised word/number
contests. It does not bundle the TV show's protected graphics or audio.

## Implemented in the first iteration

- Full responsive home screen with 4 modes, studio illustration and navigation.
- Shared round framing, tile rack and countdown clock for Letters and Numbers.
- Optional Rive Canvas runtime integration with CSS fallback when no .riv is provided.
- Safe arithmetic parser (no eval) which verifies that used numbers are in the draw.
- Letter composition checks, explicitly *not* dictionary validation.
- Configurable API URL for deployments.

Existing Duel and Final Words routes remain available; their full gameplay and
dictionary/score logic require a later iteration.

## Editing the animation in rive.app

Create an artboard appropriate for a landscape hero (for example, 960 x 700).
Name the state machine `Studio`; expose trigger inputs:

| Trigger | Intended event |
| ------- | -------------- |
| `intro` | Opening view / ambient studio lights |
| `draw` | New tile draw / reveal |
| `success` | Correct answer / celebration |

Suggested layers: stage backdrop, concentric light rings, large illuminated
screen, title, tile holders, light accents. Keep puzzle tiles themselves in
accessible React DOM; Rive is decorative and must not contain essential text.

Export to `client/public/animations/studio.riv`, and set:

```dotenv
REACT_APP_RIVE_STUDIO_SRC=/animations/studio.riv
```

Copy `client/.env.example` to `client/.env` and restart the development server.
The runtime loads on demand from the pinned Rive Canvas CDN only when a path is
configured. To ship fully offline or with a restrictive Content Security
Policy, bundle the Rive runtime locally in a subsequent dependency upgrade.

The current interface *does not contain a compiled .riv asset*: it shows a CSS
illustration until the custom Rive animation is created and exported.

## Development

```bash
cd server && yarn && yarn start
# separate shell
cd client && yarn && yarn start
```

## Follow-up work

1. Animate the tile draw in Rive and connect React events to `draw`/`success`.
2. Build a dictionary/lexicon service for valid French words and scoring.
3. Generate solvable numbers draws and provide step-by-step solution validation.
4. Finish Duel / Final Words, turn-based score tracking and tests.
5. Optionally move to the packaged React Rive runtime after updating the lockfile.
