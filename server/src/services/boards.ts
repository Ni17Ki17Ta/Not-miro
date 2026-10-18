import crypto from 'node:crypto';
import { prisma } from '../prisma.js';

export class BoardError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
    this.name = 'BoardError';
  }
}

const INVITE_TTL_DAYS = 7;

function generateInviteToken(): string {
  return crypto.randomUUID();
}

function inviteExpiresAt(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// ============ Создание доски ============

export async function createBoard(userId: string, title: string) {
  return prisma.board.create({
    data: {
      title: title.trim() || 'Новая доска',
      ownerId: userId,
      inviteToken: generateInviteToken(),
      inviteExpiresAt: inviteExpiresAt(),
    },
    select: {
      id: true,
      title: true,
      inviteToken: true,
      inviteExpiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ============ Все доски пользователя ============

export async function getUserBoards(userId: string) {
  return prisma.board.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      inviteToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ============ Одна доска (только владелец) ============

export async function getBoardById(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new BoardError('BOARD_NOT_FOUND', 'Доска не найдена', 404);
  }
  if (board.ownerId !== userId) {
    throw new BoardError('FORBIDDEN', 'Нет доступа к этой доске', 403);
  }
  return {
    id: board.id,
    title: board.title,
    inviteToken: board.inviteToken,
    inviteExpiresAt: board.inviteExpiresAt,
    elements: JSON.parse(board.elements),
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

// ============ Доступ по invite-токену ============

export async function getBoardByInviteToken(token: string) {
  const board = await prisma.board.findUnique({ where: { inviteToken: token } });
  if (!board) {
    throw new BoardError('INVITE_INVALID', 'Приглашение недействительно', 404);
  }
  if (board.inviteExpiresAt < new Date()) {
    throw new BoardError('INVITE_EXPIRED', 'Срок действия приглашения истёк', 410);
  }
  return {
    id: board.id,
    title: board.title,
    inviteToken: board.inviteToken,
    inviteExpiresAt: board.inviteExpiresAt,
    elements: JSON.parse(board.elements),
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

// ============ Обновление доски (только владелец) ============

export async function updateBoard(
  boardId: string,
  userId: string,
  data: { title?: string; elements?: unknown[] },
) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new BoardError('BOARD_NOT_FOUND', 'Доска не найдена', 404);
  }
  if (board.ownerId !== userId) {
    throw new BoardError('FORBIDDEN', 'Только владелец может изменять доску', 403);
  }

  return prisma.board.update({
    where: { id: boardId },
    data: {
      ...(data.title !== undefined && { title: data.title.trim() || 'Без названия' }),
      ...(data.elements !== undefined && { elements: JSON.stringify(data.elements) }),
    },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });
}

// ============ Удаление доски (только владелец) ============

export async function deleteBoard(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new BoardError('BOARD_NOT_FOUND', 'Доска не найдена', 404);
  }
  if (board.ownerId !== userId) {
    throw new BoardError('FORBIDDEN', 'Только владелец может удалить доску', 403);
  }
  await prisma.board.delete({ where: { id: boardId } });
}

// ============ Регенерация invite-токена (только владелец) ============
// Старая ссылка становится невалидной

export async function regenerateInviteToken(boardId: string, userId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new BoardError('BOARD_NOT_FOUND', 'Доска не найдена', 404);
  }
  if (board.ownerId !== userId) {
    throw new BoardError('FORBIDDEN', 'Только владелец может регенерировать приглашение', 403);
  }

  return prisma.board.update({
    where: { id: boardId },
    data: {
      inviteToken: generateInviteToken(),
      inviteExpiresAt: inviteExpiresAt(),
    },
    select: {
      inviteToken: true,
      inviteExpiresAt: true,
    },
  });
}

// ============ Проверка доступа (для сокетов) ============

export async function checkBoardAccess(
  boardId: string,
  userId: string,
  inviteToken?: string,
): Promise<{ isOwner: boolean; board: { id: string; title: string; ownerId: string } }> {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) {
    throw new BoardError('BOARD_NOT_FOUND', 'Доска не найдена', 404);
  }

  const isOwner = board.ownerId === userId;
  if (isOwner) {
    return {
      isOwner: true,
      board: { id: board.id, title: board.title, ownerId: board.ownerId },
    };
  }

  if (inviteToken && board.inviteToken === inviteToken && board.inviteExpiresAt >= new Date()) {
    return {
      isOwner: false,
      board: { id: board.id, title: board.title, ownerId: board.ownerId },
    };
  }

  throw new BoardError('FORBIDDEN', 'Нет доступа к этой доске', 403);
}