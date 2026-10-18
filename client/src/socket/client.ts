import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

const API_URL = import.meta.env.PROD ? undefined : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      // JWT передаётся в handshake.auth — сервер проверит и отклонит невалидные
      auth: {
        token: getAccessToken() || '',
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  // Обновляем токен при каждом подключении (мог обновиться через refresh)
  s.auth = { token: getAccessToken() || '' };
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}