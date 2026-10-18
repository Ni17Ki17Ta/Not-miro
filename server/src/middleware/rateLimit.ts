import rateLimit from 'express-rate-limit';

// Жёсткий лимит для auth-эндпоинтов: 20 попыток за 15 минут с одного IP.
// Защита от брутфорса паролей и перебора email.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20,                   // 20 запросов
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Слишком много попыток. Попробуйте через 15 минут.',
    code: 'RATE_LIMITED',
  },
  // Не считать healthcheck и OPTIONS — они не атакующие
  skip: (req) => req.path === '/health' || req.method === 'OPTIONS',
});

// Мягкий лимит для обычных API (boards, elements): 300 запросов за 15 минут.
// Защита от случайных ботов, которые дудосят, но не мешает нормальной работе.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Слишком много запросов. Подождите немного.',
    code: 'RATE_LIMITED',
  },
  skip: (req) => req.method === 'OPTIONS',
});