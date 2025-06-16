# ===== Билд-стадия =====
# Используем официальный образ Node.js с Alpine (легковесный)
FROM node:18-bullseye AS builder

# Рабочая директория в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json (или yarn.lock)
COPY package*.json ./
COPY vite.config.mts ./

# Устанавливаем зависимости (включая devDependencies)
RUN npm i

# Копируем ВСЕ файлы проекта
COPY . .

# Собираем проект (если нужно)
RUN npm run prod:build

# Удаляем devDependencies (опционально)
RUN npm prune --omit=dev

# ===== Финальная стадия =====
FROM node:18-bullseye

WORKDIR /app

# Копируем только нужное из builder-стадии
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist 
COPY --from=builder /app/src ./src  

# Пользователь node (для безопасности)
USER node

# Порт, который слушает приложение
EXPOSE 3001

# Команда запуска
CMD ["npm", "run", "prod:start"]