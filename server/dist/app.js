"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const swaggerConfig_1 = require("./config/swaggerConfig");
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const gameRoutes_1 = __importDefault(require("./routes/gameRoutes"));
const app = (0, express_1.default)();
app.use('/api-docs', swaggerConfig_1.swaggerUi.serve, swaggerConfig_1.swaggerUi.setup(swaggerConfig_1.swaggerDocs));
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
app.use('/api/game', gameRoutes_1.default);
exports.default = app;
