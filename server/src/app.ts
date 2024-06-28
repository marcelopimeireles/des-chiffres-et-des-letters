import express from 'express';
import { swaggerDocs, swaggerUi } from './config/swaggerConfig';

import bodyParser from 'body-parser';
import cors from 'cors';
import gameRoutes from './routes/gameRoutes';

const app = express();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use(cors());
app.use(bodyParser.json());

app.use('/api/game', gameRoutes);

export default app;
