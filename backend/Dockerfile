# backend/Dockerfile

# Etapa 1: Construcción (opcional para JS simple, pero buena práctica si tuvieras un paso de build)
# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# # Si usaras --legacy-peer-deps aquí, también lo necesitarías en la etapa de producción si copias node_modules
# RUN npm install --only=production --ignore-scripts --prefer-offline 
# COPY . .
# # Si tuvieras un paso de compilación (ej. TypeScript a JS):
# # RUN npm run build

# Etapa 2: Producción
# Usar una imagen Alpine Linux para un tamaño final más pequeño.
# Node.js 20.x LTS es una buena opción actual.
FROM node:20-alpine AS production

# Metadatos de la imagen (opcional pero informativo)
LABEL maintainer="tu-nombre <tu-email@example.com>"
LABEL version="1.0.0"
LABEL description="Backend para la aplicación de administración y visualización."

# Argumento para el entorno de Node, por defecto a producción.
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Variable de entorno para el puerto en el que la aplicación escucha DENTRO del contenedor.
# Este valor debe coincidir con el puerto que tu app Express usa (ej. app.listen(process.env.PORT)).
ENV PORT=3001

# Establecer el directorio de trabajo dentro del contenedor.
WORKDIR /app

# Copiar package.json y package-lock.json (si existe) primero.
# Esto aprovecha el caché de capas de Docker: si estos archivos no cambian,
# Docker no volverá a ejecutar npm install innecesariamente.
COPY package*.json ./

# Instalar solo dependencias de producción.
# --ignore-scripts puede prevenir problemas con algunos paquetes en entornos Alpine.
# --prefer-offline intentará usar el caché de npm si los paquetes ya han sido descargados.
# Ya no se necesita --legacy-peer-deps porque el conflicto de dependencias fue resuelto.
RUN npm install --only=production --ignore-scripts --prefer-offline

# Copiar el resto del código de la aplicación al directorio de trabajo /app.
COPY . .

# La carpeta 'uploads' ya no debería ser necesaria si todas las subidas van a Cloudinary.
# Si aún la necesitaras por alguna razón (ej. archivos temporales antes de subir a Cloudinary,
# aunque con memoryStorage esto es menos probable), la crearías aquí.
# RUN mkdir -p uploads && chown node:node uploads
# Recuerda que para persistencia, usarías volúmenes en Easypanel.

# Exponer el puerto en el que la aplicación se ejecuta DENTRO del contenedor.
# Easypanel se encargará de mapear este puerto a un puerto en el host.
EXPOSE ${PORT}

# Cambiar al usuario no-root 'node' para mayor seguridad.
# La imagen base node:alpine crea este usuario por defecto.
USER node

# Comando para iniciar la aplicación cuando el contenedor arranque.
# Asegúrate que "server.js" sea el punto de entrada principal de tu aplicación.
CMD ["node", "server.js"]
