export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Board {
  id: string;
  title: string;
  inviteToken: string;
  inviteExpiresAt?: string;
  elements?: BoardElement[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardListItem {
  id: string;
  title: string;
  inviteToken: string;
  createdAt: string;
  updatedAt: string;
}

export type ElementType = 'pen' | 'rect' | 'ellipse' | 'line' | 'text' | 'image';
// ДОБАВЛЕН 'hand'
export type Tool = 'select' | 'hand' | 'pen' | 'eraser' | 'rect' | 'ellipse' | 'line' | 'text' | 'image';
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'wavy';
export type BoardBackground = 'light-grid' | 'dark-grid' | 'dots' | 'lines' | 'plain';

export interface BoardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  points?: number[];
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color: string;
  fill?: string;
  strokeWidth: number;
  lineStyle?: LineStyle;
  imageUrl?: string;
  zIndex: number;
  createdBy: string;
  version: number;
  updatedAt: number;
}

export type Operation =
  | { type: 'add'; element: BoardElement }
  | { type: 'update'; element: BoardElement }
  | { type: 'remove'; elementId: string; createdBy: string }
  | { type: 'clear'; byUserId: string };

export interface Participant {
  socketId: string;
  userName: string;
  color: string;
}

export interface RemoteCursor {
  socketId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
}

export type ConnectionState = 'connected' | 'disconnected' | 'connecting' | 'reconnecting';

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface BoardsListResponse {
  boards: BoardListItem[];
}

export interface BoardResponse {
  board: Board;
}

export interface BoardCreateResponse {
  board: {
    id: string;
    title: string;
    inviteToken: string;
    inviteExpiresAt: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface BoardUpdateResponse {
  board: {
    id: string;
    title: string;
    updatedAt: string;
  };
}

export interface InviteResponse {
  inviteToken: string;
  inviteExpiresAt: string;
}

export type ToastType = 'info' | 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}