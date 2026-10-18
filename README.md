# Not Miro

> Коллаборативная доска в стиле Miro — с авторизацией, своими досками, приглашениями по ссылке и синхронизацией в реальном времени.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

![Not Miro — дашборд](./docs/screenshot-dashboard.png)
![Not Miro — холст](./docs/screenshot-board.png)

---

## Что умеет

### Аутентификация
- ✅ Регистрация и вход по email + пароль
- ✅ JWT access-токены (15 мин) + httpOnly refresh-cookie (7 дней)
- ✅ Автоматическое восстановление сессии при перезагрузке страницы
- ✅ Защита от брутфорса (rate limiting)

### Доски
- ✅ Свой дашборд — у каждого пользователя только его доски
- ✅ Создание, переименование, удаление
- ✅ **Приглашения только по ссылке** — уникальный токен, срок жизни 7 дней
- ✅ Регенерация ссылки (старая сразу становится невалидной)
- ✅ Роли: **владелец** (полные права) и **гость** (только рисование)

### Холст
- ✅ Инструменты: карандаш, прямоугольник, эллипс, линия, текст
- ✅ 7 цветов, 4 толщины
- ✅ Zoom (колесо) и pan (пробел / средняя кнопка)
- ✅ Undo / Redo — **только для своих действий**
- ✅ Очистка доски (только владелец)

### Realtime-синхронизация
- ✅ Socket.IO с JWT-аутентификацией в handshake
- ✅ Все элементы синхронизируются мгновенно между участниками
- ✅ **Курсоры других пользователей** с именами и цветами
- ✅ Список онлайн-участников
- ✅ Индикатор соединения (Онлайн / Офлайн / Переподключение)
- ✅ Автоматическое переподключение при обрыве сети

---

## Стек

| Слой | Технологии |
|---|---|
| **Frontend** | React 18, Vite, TypeScript (strict), react-konva, Zustand, TanStack Query, React Router v6 |
| **Backend** | Node.js 20, Express, TypeScript, Socket.IO, Prisma ORM, SQLite |
| **Auth** | JWT (access + refresh), bcrypt, httpOnly cookie, express-rate-limit |
| **Validation** | Zod (схемы на всех эндпоинтах и socket-сообщениях) |
| **Tooling** | Docker Compose, Vitest, ESLint, Prettier |

---

## Архитектура
