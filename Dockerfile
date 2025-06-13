# Сборка проекта
FROM node:20-alpine AS builder

WORKDIR /app
COPY . .

RUN npm ci --omit=dev && \ npm run build

# Финальный образ
FROM node:20-alpine

WORKDIR /app
ENV MODE=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./dist
COPY --from=builder /app/package.json ./dist

USER node
EXPOSE 3000
CMD ["node", "./dist/index.js"]