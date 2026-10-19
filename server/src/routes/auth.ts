import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { registerUser, loginUser, getUserById, AuthError } from '../services/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TOKEN_TTL,
} from '../services/tokens.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../prisma.js';

const router = Router();

// ============ Схемы валидации ============

const registerSchema = z.object({
  email: z.string().email('Неверный email').max(255),
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(100),
  name: z.string().min(1, 'Имя обязательно').max(100).trim(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ============ Хелпер для cookie ============

const REFRESH_COOKIE_NAME = 'refreshToken';
const cookieOptions = {
  httpOnly: true,                                  // недоступно JS на клиенте
  secure: process.env.NODE_ENV === 'production',   // только HTTPS в проде
  // Lax позволяет отправлять cookie при перезагрузке страницы и переходах,
  // Strict блокирует их в некоторых конфигурациях браузера
  sameSite: 'lax' as const, 
  path: '/', // Расширяем путь, чтобы cookie была доступна для всех API запросов
  maxAge: TOKEN_TTL.refreshSeconds * 1000,         // 7 дней в миллисекундах
};

// ============ POST /api/auth/register ============

router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data.email, data.password, data.name);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/auth/login ============

router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data.email, data.password);
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, cookieOptions);
    res.json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
});

// ============ POST /api/auth/refresh ============
// Берём refresh из cookie, проверяем подпись, выдаём новый access + новый refresh (ротация)

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: 'Нет refresh-токена', code: 'NO_REFRESH_TOKEN' });
      return;
    }

    const payload = verifyRefreshToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: 'Пользователь не найден', code: 'USER_NOT_FOUND' });
      return;
    }

    const accessToken = generateAccessToken(user.id, user.name);
    const newRefreshToken = generateRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);
    res.json({ user, accessToken });
  } catch (err) {
    if (err instanceof Error && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: 'Сессия истекла, войдите заново', code: 'SESSION_EXPIRED' });
      return;
    }
    next(err);
  }
});

// ============ POST /api/auth/logout ============

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// ============ GET /api/auth/me ============

router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserById(req.userId!);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;