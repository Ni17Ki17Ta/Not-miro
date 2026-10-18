import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

prisma.$on('error', (e) => logger.error({ prisma: e }, 'Prisma error'));
prisma.$on('warn', (e) => logger.warn({ prisma: e }, 'Prisma warning'));

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => logger.debug({ sql: e.query, params: e.params, ms: e.duration }, 'Prisma query'));
}

// Защита от множественных экземпляров при hot-reload (tsx watch / nodemon)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}