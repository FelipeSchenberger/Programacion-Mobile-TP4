FROM node:18-alpine AS builder 
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# para expo: build web; asegúrate de tener el script "web-build": "expo build:web" o "expo export:web"
RUN npx expo start

FROM node:18-alpine AS runner
WORKDIR /app
RUN npm i -g serve
COPY --from=builder /app/web-build ./web
EXPOSE 8080
CMD ["serve", "-s", "web", "-l", "8080"]