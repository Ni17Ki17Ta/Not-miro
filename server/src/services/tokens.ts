import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

// ============ Типы payload ============

export interface AccessPayload {
  userId: string;
  name: string;
  type: 'access';
}

export interface RefreshPayload {
  userId: string;
  type: 'refresh';
}

// ============ Access token (15 минут) ============

export function generateAccessToken(userId: string, name: string): string {
  const payload: AccessPayload = { userId, name, type: 'access' };
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'access') {
    throw new Error('Invalid access token payload');
  }
  return decoded as AccessPayload;
}

// ============ Refresh token (7 дней) ============

export function generateRefreshToken(userId: string): string {
  const payload: RefreshPayload = { userId, type: 'refresh' };
  return jwt.sign(payload, config.REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const decoded = jwt.verify(token, config.REFRESH_SECRET);
  if (typeof decoded === 'string' || decoded.type !== 'refresh') {
    throw new Error('Invalid refresh token payload');
  }
  return decoded as RefreshPayload;
}

// ============ Хэширование refresh для БД ============
// Храним не сам токен, а его bcrypt-хэш: если БД утечёт — токены не восстановить

export async function hashRefreshToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function compareRefreshToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

// ============ Утилита для получения времени жизни ============

export const TOKEN_TTL = {
  accessSeconds: 15 * 60,        // 15 минут
  refreshSeconds: 7 * 24 * 60 * 60, // 7 дней
} as const;