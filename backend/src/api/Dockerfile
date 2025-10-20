# backend/api/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY wait-for.js ./wait-for.js
EXPOSE 3001
CMD ["sh", "-c", "node wait-for.js kafka 9092 60000 && npm run start:api"]
