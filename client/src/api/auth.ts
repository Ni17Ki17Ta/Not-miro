import { api } from './client';
import type { AuthResponse, User } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', { email, password, name });
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function me(): Promise<User> {
  const res = await api.get<{ user: User }>('/auth/me');
  return res.data.user;
}