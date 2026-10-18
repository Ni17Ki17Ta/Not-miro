import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import authRouter from './routes/auth.js';
import boardsRouter from './routes/boards.js';
import { setupSocket } from './socket/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  const io = new SocketServer(server, {
    cors: { origin: config.CLIENT_URL, credentials: true },
  });

  // --- Global middleware ---
  app.use(helmet());
  app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  // --- Routes ---
  app.use('/api/auth', authRouter);
  app.use('/api/boards', boardsRouter);

  // --- Socket.IO ---
  setupSocket(io);

  // --- Healthcheck ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // --- Error handling (в конце, после всех роутов) ---
  app.use(notFoundHandler);
  app.use(errorHandler);

  // --- Start ---
  server.listen(config.PORT, () => {
    logger.info(`🚀 Not Miro server: http://localhost:${config.PORT}`);
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    io.close();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});