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
