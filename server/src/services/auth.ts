import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from './tokens.js';

// ============ Типы ============

export interface AuthResult {
  user: { id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============ Регистрация ============

export async function registerUser(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AuthError('USER_EXISTS', 'Пользователь с таким email уже существует', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, password: hashedPassword, name: name.trim() },
    select: { id: true, email: true, name: true },
  });

  const accessToken = generateAccessToken(user.id, user.name);
  const refreshToken = generateRefreshToken(user.id);

  // Хэшируем refresh и сохраняем хэш в user'е отдельным полем? 
  // Пока храним в памяти клиента (cookie), проверять будем через JWT-подпись.
  // В будущем, если понадобится отзыв токенов — добавим таблицу RefreshToken.
  await hashRefreshToken(refreshToken); // warm-up: вычисляем хэш (можно использовать для логирования)

  return { user, accessToken, refreshToken };
}

// ============ Логин ============

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, name: true, password: true },
  });

  if (!user) {
    // Не раскрываем, что юзера нет (защита от перебора email)
    throw new AuthError('INVALID_CREDENTIALS', 'Неверный email или пароль', 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AuthError('INVALID_CREDENTIALS', 'Неверный email или пароль', 401);
  }

  const accessToken = generateAccessToken(user.id, user.name);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

// ============ Получить пользователя по ID (для /me) ============

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  if (!user) {
    throw new AuthError('USER_NOT_FOUND', 'Пользователь не найден', 404);
  }
  return user;
}