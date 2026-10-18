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
