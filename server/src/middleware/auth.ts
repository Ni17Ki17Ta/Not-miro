import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokens.js';

// Расширяем тип Request, чтобы добавить свои поля
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userName?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация', code: 'NO_TOKEN' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userName = payload.name;
    next();
  } catch {
    res.status(401).json({ error: 'Неверный или истёкший токен', code: 'INVALID_TOKEN' });
  }
}