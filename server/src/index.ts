import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';

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

  // --- Routes (безопасная загрузка, пока файлы пустые) ---
  try {
    const { default: authRouter } = await import('./routes/auth.js');
    if (authRouter) app.use('/api/auth', authRouter);
  } catch (err) {
    logger.warn('auth routes not loaded (module empty or missing)');
  }

  try {
    const { default: boardsRouter } = await import('./routes/boards.js');
    if (boardsRouter) app.use('/api/boards', boardsRouter);
  } catch (err) {
    logger.warn('boards routes not loaded (module empty or missing)');
  }

  // --- Socket.IO ---
  try {
    const { setupSocket } = await import('./socket/index.js');
    if (typeof setupSocket === 'function') setupSocket(io);
  } catch (err) {
    logger.warn('socket handlers not loaded (module empty or missing)');
  }

  // --- Healthcheck ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // --- 404 ---
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // --- Error handler ---
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: err.message || 'Internal error' });
  });

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