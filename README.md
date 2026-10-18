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
