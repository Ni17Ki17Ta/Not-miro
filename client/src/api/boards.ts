import { api } from './client';
import type {
  Board,
  BoardListItem,
  BoardCreateResponse,
  BoardUpdateResponse,
  BoardsListResponse,
  BoardResponse,
  InviteResponse,
} from '../types';

export async function getMyBoards(): Promise<BoardListItem[]> {
  const res = await api.get<BoardsListResponse>('/boards');
  return res.data.boards;
}

export async function createBoard(title: string): Promise<BoardCreateResponse['board']> {
  const res = await api.post<BoardCreateResponse>('/boards', { title });
  return res.data.board;
}

export async function getBoard(id: string): Promise<Board> {
  const res = await api.get<BoardResponse>(`/boards/${id}`);
  return res.data.board;
}

export async function getBoardByInvite(token: string): Promise<Board> {
  const res = await api.get<BoardResponse>(`/boards/join/${token}`);
  return res.data.board;
}

export async function updateBoard(
  id: string,
  data: { title?: string; elements?: unknown[] },
): Promise<BoardUpdateResponse['board']> {
  const res = await api.patch<BoardUpdateResponse>(`/boards/${id}`, data);
  return res.data.board;
}

export async function deleteBoard(id: string): Promise<void> {
  await api.delete(`/boards/${id}`);
}

export async function regenerateInvite(id: string): Promise<InviteResponse> {
  const res = await api.post<InviteResponse>(`/boards/${id}/invite`);
  return res.data;
}

// ============ Хелпер для invite-ссылки ============

export function buildInviteUrl(token: string): string {
  return `${window.location.origin}/join/${token}`;
}