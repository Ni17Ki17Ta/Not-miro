import type { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from '../services/tokens.js';
import { logger } from '../logger.js';
import { setupHandlers } from './handlers.js';

/**
 * Настраивает Socket.IO: JWT-аутентификация в handshake + регистрация обработчиков.
 *
 * Клиент должен подключаться так:
 *   io({ auth: { token: accessToken } })
 *
 * Если токена нет / он невалидный — соединение отклоняется до `connection`.
 */
export function setupSocket(io: SocketServer): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token || typeof token !== 'string') {
      logger.warn({ socketId: socket.id }, 'Socket auth failed: no token');
      return next(new Error('AUTH_REQUIRED'));
    }

    try {
      const payload = verifyAccessToken(token);
      // Кладём данные в socket.data, чтобы handlers.ts мог их использовать
      socket.data.userId = payload.userId;
      socket.data.userName = payload.name;
      // Дублируем на верхний уровень для удобства в handlers (AuthSocket)
      (socket as unknown as { userId?: string }).userId = payload.userId;
      (socket as unknown as { userName?: string }).userName = payload.name;
      next();
    } catch (err) {
      logger.warn({ socketId: socket.id, err }, 'Socket auth failed: invalid token');
      return next(new Error('INVALID_TOKEN'));
    }
  });

  setupHandlers(io);

  logger.info('✅ Socket.IO ready (JWT auth enabled)');
}