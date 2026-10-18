import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true, // отправлять cookie (refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ Хранилище accessToken в памяти ============
// Не localStorage (XSS-риск), не sessionStorage. Только память.
// При перезагрузке страницы восстанавливается через /auth/refresh (cookie).

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ============ Request interceptor: добавляем Bearer ============

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ============ Response interceptor: refresh при 401 ============

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 401 от /auth/refresh или /auth/login — не пытаемся рефрешить
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        // Пока идёт refresh, копим запросы в очередь
        return new Promise((resolve) => {
          refreshQueue.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = res.data.accessToken;
        setAccessToken(newToken);

        // Размораживаем очередь
        refreshQueue.forEach((cb) => cb(newToken));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh не удался — чистим токен, редирект на логин
        setAccessToken(null);
        refreshQueue = [];
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ============ Хелпер для извлечения сообщения об ошибке ============

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || 'Ошибка запроса';
  }
  if (err instanceof Error) return err.message;
  return 'Неизвестная ошибка';
}