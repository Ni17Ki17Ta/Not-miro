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

// Prisma-события типизированы через `$on` с дженериком, но TS плохо выводит его.
// Приводим к типу "events" через `as never` — это официальный обходной путь.
prisma.$on('error' as never, ((e: { message: string }) =>
  logger.error({ prisma: e }, 'Prisma error')) as never);

prisma.$on('warn' as never, ((e: { message: string }) =>
  logger.warn({ prisma: e }, 'Prisma warning')) as never);

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, ((e: { query: string; params: string; duration: number }) =>
    logger.debug({ sql: e.query, params: e.params, ms: e.duration }, 'Prisma query')) as never);
}

// Защита от множественных экземпляров при hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}