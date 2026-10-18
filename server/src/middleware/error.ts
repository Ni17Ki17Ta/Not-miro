import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { AuthError } from '../services/auth.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod ошибка валидации
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Ошибка валидации',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  // Наши бизнес-ошибки
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }

  // JWT ошибки (не пойманы в middleware, но на всякий случай)
  if (err instanceof Error && err.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Токен истёк', code: 'TOKEN_EXPIRED' });
    return;
  }

  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Неверный токен', code: 'INVALID_TOKEN' });
    return;
  }

  // Всё остальное — 500
  const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
  const stack = err instanceof Error ? err.stack : undefined;
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { detail: message, stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Маршрут ${req.method} ${req.path} не найден`, code: 'NOT_FOUND' });
}