# Usa una imagen base de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo
WORKDIR /usr/src/app

# Copia los archivos de configuración e instala dependencias
COPY package*.json ./
RUN npm install

# Copia todo el código fuente
COPY . .

# Compila la aplicación NestJS
RUN npm run build

# Comando para iniciar la aplicación compilada
CMD [ "npm", "run", "start" ]