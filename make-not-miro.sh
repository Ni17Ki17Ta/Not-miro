#!/usr/bin/env bash
# Генератор скелета проекта «Not Miro». Запуск: bash make-not-miro.sh
set -euo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
ROOT="not-miro"

rm -rf "$ROOT" not-miro.zip
mkdir -p "$ROOT"
cd "$ROOT"

# ---------- Структура папок ----------
mkdir -p shared \
  server/prisma \
  server/src/middleware server/src/routes server/src/services server/src/socket server/src/__tests__ \
  client/public \
  client/src/api client/src/socket client/src/store client/src/hooks client/src/components \
  client/src/pages client/src/types client/src/utils client/src/__tests__

# ---------- Пустые файлы (0 байт) ----------
touch shared/types.ts

touch server/prisma/schema.prisma
touch server/src/index.ts server/src/config.ts server/src/logger.ts server/src/prisma.ts
touch server/src/middleware/auth.ts server/src/middleware/error.ts server/src/middleware/rateLimit.ts
touch server/src/routes/auth.ts server/src/routes/boards.ts
touch server/src/services/auth.ts server/src/services/boards.ts server/src/services/tokens.ts
touch server/src/socket/index.ts server/src/socket/handlers.ts server/src/socket/boardStore.ts
touch server/src/__tests__/auth.test.ts server/src/__tests__/boardAccess.test.ts server/src/__tests__/boardStore.test.ts

touch client/public/.gitkeep
touch client/src/main.tsx client/src/App.tsx client/src/vite-env.d.ts client/src/index.css
touch client/src/api/client.ts client/src/api/auth.ts client/src/api/boards.ts
touch client/src/socket/client.ts
touch client/src/store/auth.ts client/src/store/board.ts client/src/store/ui.ts
touch client/src/hooks/useSocket.ts client/src/hooks/useHotkeys.ts client/src/hooks/useBoardSync.ts
touch client/src/components/Whiteboard.tsx client/src/components/Toolbar.tsx \
  client/src/components/PropertiesPanel.tsx client/src/components/ParticipantsPanel.tsx \
  client/src/components/ConnectionIndicator.tsx client/src/components/Toasts.tsx \
  client/src/components/HotkeysHelp.tsx
touch client/src/pages/Login.tsx client/src/pages/Register.tsx client/src/pages/Dashboard.tsx client/src/pages/Board.tsx
touch client/src/types/index.ts
touch client/src/utils/geometry.ts client/src/utils/export.ts
touch client/src/__tests__/boardReducer.test.ts

# ---------- Корневые конфиги ----------
cat > package.json <<'EOF'
{
  "name": "not-miro",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "server",
    "client"
  ],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w server\" \"npm run dev -w client\"",
    "setup": "npm install && npm run db:generate -w server && npm run db:push -w server",
    "test": "npm run test -w server && npm run test -w client"
  },
  "devDependencies": {
    "concurrently": "^9.0.1"
  }
}
EOF

cat > .gitignore <<'EOF'
node_modules
dist
build
.env
*.db
*.db-journal
coverage
.DS_Store
.vscode
.idea
EOF

cat > .editorconfig <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
EOF

cat > .prettierrc <<'EOF'
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
EOF

cat > .env.example <<'EOF'
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-me-32-chars-min"
REFRESH_SECRET="change-me-32-chars-min"
PORT=3001
CLIENT_URL=http://localhost:5173
EOF

cat > docker-compose.yml <<'EOF'
services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    env_file:
      - .env
    environment:
      # SQLite-файл лежит в именованном томе, чтобы данные переживали пересоздание контейнера
      DATABASE_URL: "file:/data/dev.db"
      CLIENT_URL: "http://localhost:5173"
    volumes:
      - ./server:/app
      - /app/node_modules
      - ./shared:/shared
      - server-data:/data

  client:
    build: ./client
    ports:
      - "5173:5173"
    environment:
      VITE_API_TARGET: "http://server:3001"
    volumes:
      - ./client:/app
      - /app/node_modules
      - ./shared:/shared
    depends_on:
      - server

volumes:
  server-data:
EOF

cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

# ---------- Server ----------
cat > server/package.json <<'EOF'
{
  "name": "not-miro-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.4.0",
    "prisma": "^5.22.0",
    "socket.io": "^4.8.0",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.16.5",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
EOF

cat > server/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "types": ["node"],
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "../shared"],
  "exclude": ["node_modules", "dist"]
}
EOF

cat > server/Dockerfile <<'EOF'
# Dev-образ сервера. Запуск: docker compose up (см. docker-compose.yml)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
# Перед первым запуском заполните prisma/schema.prisma, затем выполните:
#   docker compose exec server npx prisma db push
CMD ["npm", "run", "dev"]
EOF

# ---------- Client ----------
cat > client/package.json <<'EOF'
{
  "name": "not-miro-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "konva": "^9.3.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-konva": "^18.2.10",
    "react-router-dom": "^6.26.2",
    "socket.io-client": "^4.8.0",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
EOF

cat > client/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["src", "../shared"]
}
EOF

cat > client/vite.config.ts <<'EOF'
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
    },
  },
});
EOF

cat > client/index.html <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Not Miro</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

cat > client/Dockerfile <<'EOF'
# Dev-образ клиента. Запуск: docker compose up (см. docker-compose.yml)
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
EOF

# ---------- Документация ----------
cat > README.md <<'EOF'
# Not Miro

Коллаборативная онлайн-доска в стиле Miro.

## Стек

-

## Быстрый старт

```bash
npm install
npm run setup
npm run dev
```

Через Docker:

```bash
docker compose up
```

## Структура

```
not-miro/
├── package.json
├── README.md
├── GITHUB_SETUP.md
├── LICENSE
├── .gitignore
├── .editorconfig
├── .prettierrc
├── .env.example
├── docker-compose.yml
├── make-not-miro.sh
├── shared/
│   └── types.ts
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.ts, config.ts, logger.ts, prisma.ts
│       ├── middleware/   (auth, error, rateLimit)
│       ├── routes/       (auth, boards)
│       ├── services/     (auth, boards, tokens)
│       ├── socket/       (index, handlers, boardStore)
│       └── __tests__/    (auth, boardAccess, boardStore)
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── Dockerfile
    ├── public/
    └── src/
        ├── main.tsx, App.tsx, vite-env.d.ts, index.css
        ├── api/          (client, auth, boards)
        ├── socket/       (client)
        ├── store/        (auth, board, ui)
        ├── hooks/        (useSocket, useHotkeys, useBoardSync)
        ├── components/   (Whiteboard, Toolbar, PropertiesPanel, ParticipantsPanel,
        │                  ConnectionIndicator, Toasts, HotkeysHelp)
        ├── pages/        (Login, Register, Dashboard, Board)
        ├── types/
        ├── utils/        (geometry, export)
        └── __tests__/    (boardReducer)
```

Перед запуском скопируйте `.env.example` в `.env`.

## Публикация на GitHub

См. [GITHUB_SETUP.md](./GITHUB_SETUP.md).
EOF

cat > GITHUB_SETUP.md <<'EOF'
# Публикация проекта на GitHub

## 1. Установка Git

Скачайте Git: https://git-scm.com/downloads и установите. Проверьте установку:

```bash
git --version
```

## 2. Настройка git config

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "you@example.com"
```

## 3. Создание пустого репозитория

Откройте https://github.com/new и создайте репозиторий с именем `not-miro`.
**Не** ставьте галочки «Add a README», «Add .gitignore» и «Choose a license» — эти файлы уже есть в проекте.

## 4. Вариант A — HTTPS + Personal Access Token

1. На GitHub: Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic).
2. Выберите scope `repo`, создайте токен и сразу скопируйте его (повторно он не покажется).
3. В папке проекта выполните:

```bash
git remote add origin https://github.com/USERNAME/not-miro.git
git branch -M main
git push -u origin main
```

Когда Git спросит пароль, вставьте токен вместо пароля. Вместо `USERNAME` подставьте ваш логин GitHub.

## 5. Вариант B — SSH

1. Сгенерируйте ключ:

```bash
ssh-keygen -t ed25519 -C "you@example.com"
```

2. Скопируйте содержимое публичного ключа (`~/.ssh/id_ed25519.pub`) и добавьте его на GitHub: Settings → SSH and GPG keys → New SSH key.
3. Проверьте подключение:

```bash
ssh -T git@github.com
```

4. Подключите репозиторий и отправьте код:

```bash
git remote add origin git@github.com:USERNAME/not-miro.git
git branch -M main
git push -u origin main
```

## 6. Последующие изменения

```bash
git add .
git commit -m "Описание изменений"
git push
```

## 7. Частые ошибки

- `remote origin already exists` — обновите адрес: `git remote set-url origin <новый-URL>`.
- `Authentication failed` — GitHub не принимает пароль от аккаунта; используйте Personal Access Token.
- `Permission denied (publickey)` — проверьте, что ключ добавлен на GitHub, и запустите `ssh -T git@github.com`.
- `src refspec main does not match any` — в репозитории нет коммитов: выполните `git add .` и `git commit -m "init"`, затем повторите push.

## 8. Опционально: деплой

- Client → Vercel: импортируйте репозиторий, Root Directory = `client`, Build Command = `npm run build`, Output Directory = `dist`.
- В Vercel задайте rewrites для `/api` на адрес вашего сервера (или используйте переменную окружения с URL API).
- Server → Railway: New Project → Deploy from GitHub, Root Directory = `server`, Start Command = `npm run build && npm start`.
- Добавьте в Railway плагин PostgreSQL, переключите provider в `schema.prisma` на `postgresql` и пропишите `DATABASE_URL` из Railway.
- Задайте `JWT_SECRET`, `REFRESH_SECRET`, `CLIENT_URL` (адрес Vercel) в переменных окружения Railway.
EOF

# ---------- Копия этого скрипта внутрь проекта ----------
cp "$SELF" make-not-miro.sh
chmod +x make-not-miro.sh

# ---------- Git + ZIP ----------
git init -q -b main
git add .
git -c user.name="Not Miro Bot" -c user.email="bot@not-miro.local" commit -q -m "init: project skeleton"

cd ..
zip -rq not-miro.zip not-miro/ -x "*/node_modules/*"
echo "Готово: $(pwd)/not-miro.zip"
