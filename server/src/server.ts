import { resolve } from 'node:path';
import { enableGameStatePersistence } from './services/gameStatePersistence';
import app from './app';

const PORT = process.env.PORT || 5000;
const statePath = process.env.GAME_STATE_FILE || resolve(process.cwd(), 'data/runtime/game-state.json');

// Load persisted rounds *before* accepting incoming requests.
// A corrupted/incompatible snapshot aborts startup rather than losing scores.
enableGameStatePersistence(statePath);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
