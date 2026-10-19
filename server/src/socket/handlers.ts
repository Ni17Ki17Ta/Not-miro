import type { Server, Socket } from 'socket.io';
import { logger } from '../logger.js';
import { checkBoardAccess } from '../services/boards.js';
import {
  getBoardElements,
  applyOperation,
  setBoardOwner,
  saveNow,
  type Operation,
} from './boardStore.js';

interface JoinBoardData {
  boardId: string;
  inviteToken?: string;
}

interface CursorMoveData {
  x: number;
  y: number;
}

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
  boardId?: string;
  isOwner?: boolean;
  cursorColor?: string;
}

const CURSOR_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#34495e',
];

let colorCounter = 0;
function nextColor(): string {
  const color = CURSOR_COLORS[colorCounter % CURSOR_COLORS.length];
  colorCounter++;
  return color;
}

export function setupHandlers(io: Server): void {
  io.on('connection', (socket: AuthSocket) => {
    socket.cursorColor = nextColor();
    logger.info({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

    socket.on('join-board', async (data: JoinBoardData, ack?: (res: unknown) => void) => {
      try {
        if (!socket.userId) {
          socket.emit('error-msg', { code: 'NO_AUTH', message: 'Нет авторизации' });
          return;
        }
        if (!data?.boardId) {
          socket.emit('error-msg', { code: 'NO_BOARD_ID', message: 'Не указан boardId' });
          return;
        }

        const { isOwner, board } = await checkBoardAccess(
          data.boardId,
          socket.userId,
          data.inviteToken,
        );

        if (socket.boardId && socket.boardId !== data.boardId) {
          socket.leave(socket.boardId);
          socket.to(socket.boardId).emit('user-left', {
            socketId: socket.id,
            userName: socket.userName,
          });
        }

        socket.join(data.boardId);
        socket.boardId = data.boardId;
        socket.isOwner = isOwner;

        setBoardOwner(data.boardId, board.ownerId);

        const elements = await getBoardElements(data.boardId);
        socket.emit('board-state', { elements, isOwner });

        socket.to(data.boardId).emit('user-joined', {
          socketId: socket.id,
          userName: socket.userName,
          color: socket.cursorColor,
        });

        const roomSockets = await io.in(data.boardId).fetchSockets();
        const participants = roomSockets
          .filter((s) => s.id !== socket.id)
          .map((s) => {
            const remote = s as unknown as AuthSocket;
            return {
              socketId: s.id,
              userName: remote.userName,
              color: remote.cursorColor,
            };
          });
        socket.emit('participants', participants);

        logger.info({ socketId: socket.id, boardId: data.boardId, isOwner }, 'User joined board');
        ack?.({ ok: true, isOwner });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Не удалось войти на доску';
        socket.emit('error-msg', { code: 'JOIN_FAILED', message });
        ack?.({ ok: false, error: message });
        logger.warn({ err, socketId: socket.id }, 'Join board failed');
      }
    });

    socket.on('board-operation', (op: Operation) => {
      if (!socket.boardId || !socket.userId) return;
      if (!op || typeof op !== 'object' || !('type' in op)) return;

      const result = applyOperation(socket.boardId, op, socket.userId);

      if (!result.ok) {
        socket.emit('error-msg', {
          code: 'OP_REJECTED',
          message: result.error || 'Операция отклонена',
        });
        return;
      }

      socket.to(socket.boardId).emit('board-operation', op);

      if (op.type === 'clear') {
        void getBoardElements(socket.boardId).then((elements) => {
          io.in(socket.boardId!).emit('board-state', {
            elements,
            isOwner: socket.isOwner ?? false,
          });
        });
      }
    });

    // Принудительное сохранение перед закрытием вкладки
    socket.on('save-now', async () => {
      if (!socket.boardId) return;
      await saveNow(socket.boardId);
      logger.info({ boardId: socket.boardId }, 'Board saved (save-now)');
    });

    socket.on('cursor-move', (data: CursorMoveData) => {
      if (!socket.boardId) return;
      if (typeof data?.x !== 'number' || typeof data?.y !== 'number') return;

      socket.to(socket.boardId).emit('cursor-move', {
        socketId: socket.id,
        userName: socket.userName,
        color: socket.cursorColor,
        x: data.x,
        y: data.y,
      });
    });

    socket.on('leave-board', () => {
      if (!socket.boardId) return;
      const boardId = socket.boardId;
      socket.leave(boardId);
      socket.to(boardId).emit('user-left', {
        socketId: socket.id,
        userName: socket.userName,
      });
      socket.boardId = undefined;
      socket.isOwner = undefined;
    });

    socket.on('disconnect', (reason) => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('user-left', {
          socketId: socket.id,
          userName: socket.userName,
        });
      }
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });
}