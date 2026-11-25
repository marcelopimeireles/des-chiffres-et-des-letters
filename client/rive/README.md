# Interactive Rive studio

`scene.rml` is the editable source for the board, controls, keyboard, text bindings
and tile reveal. The web runtime loads the exported artboard `Game Board` and
starts its `Game` state machine. It sends control triggers to the web client.
The web client exchanges game state with the existing Express API, then updates
the artboard's `Game` view model. The server owns round deadlines, validation, scores,
and saved matches.

Run the Rive CLI from `client` to compile and export the game board:

```sh
rive rive --verify
rive login
rive rive --publish --output-dir=../public/animations
```

Open `/rive` on the dev server. The Rive menu opens the nine-round solo game
and the four standalone modes. During a round you can use the board's keyboard
or focus the canvas and use a physical keyboard. The route loads
`/animations/game-board.riv` by default. `REACT_APP_RIVE_GAME_SRC` can supply
an alternate export during development.
