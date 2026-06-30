# Usa una imagen base de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de configuración y instala dependencias
# === INICIO DE MODIFICACIÓN DEFINITIVA (Rompe-Caché) ===
# Agregamos una variable que debe ser pasada dinámicamente al build
ARG CACHE_BUST=1
# === FIN DE MODIFICACIÓN DEFINITIVA ===

COPY package*.json ./
RUN npm install

# Copia todo el código fuente
COPY . .

# Compila la aplicación NestJS
RUN npm run build

# Expone el puerto de la API (3000 por defecto)
EXPOSE 3000

# Comando para iniciar la aplicación compilada
CMD [ "npm", "run", "start" ]