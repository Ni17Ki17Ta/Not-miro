# Not Miro

Коллаборативная доска в стиле Miro: авторизация, свои доски, приглашения по ссылке, realtime-синхронизация.

## Стек

- **Frontend:** React 18 + Vite + TypeScript + react-konva + Zustand + TanStack Query
- **Backend:** Node.js 20 + Express + TypeScript + Socket.IO + Prisma + SQLite
- **Auth:** JWT (access + refresh)
- **Tooling:** Docker, Vitest, ESLint, Prettier

## Быстрый старт

### Через Docker

```bash
cp .env.example .env
docker compose up