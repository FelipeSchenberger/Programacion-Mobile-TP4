# backend/orchestrator/Dockerfile
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
# copiar el script wait-for (debe existir en backend/)
COPY wait-for.js ./wait-for.js
# esperar kafka antes de arrancar
CMD ["sh", "-c", "node wait-for.js kafka 9092 60000 && npm run start:orchestrator"]

