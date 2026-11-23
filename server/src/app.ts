import express from 'express';
import { swaggerDocs, swaggerUi } from './config/swaggerConfig';

import bodyParser from 'body-parser';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';
import { saveGameStateIfEnabled } from './services/gameStatePersistence';
import { vercelRedisMiddleware } from './services/vercelRedisState';

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// A configured CORS_ORIGIN restricts browsers to the published frontend.
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(x => x.trim()).filter(Boolean);
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : {}));
app.use(bodyParser.json());

// Persist the entire authoritative state before confirming successful mutations.
// On disk failure, return an error rather than claiming the action is durable.
app.use('/api/game', vercelRedisMiddleware);
app.use('/api/game', (_req, res, next) => {
  if (_req.method === 'POST') {
    const sendJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          saveGameStateIfEnabled();
        } catch (error) {
          console.error('Game-state persistence failed', error);
          res.status(503);
          return sendJson({
            code: 'state_save_failed',
            error: 'Game state could not be saved; check server storage.'
          });
        }
      }
      return sendJson(body);
    };
  }
  next();
});
app.use('/api/game', gameRoutes);

export default app;
