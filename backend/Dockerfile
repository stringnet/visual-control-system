# backend/Dockerfile

# Etapa 1: Construcción (si tuvieras un paso de build como TypeScript)
# Para un backend JavaScript simple, esta etapa puede ser menos crítica,
# pero es buena práctica para proyectos más complejos o para optimizar dependencias.

# FROM node:20-alpine AS builder
# WORKDIR /app
# COPY package*.json ./
# RUN npm install --only=production --ignore-scripts --prefer-offline
# COPY . .
# Si tuvieras un paso de compilación (ej. TypeScript a JS):
# RUN npm run build

# Etapa 2: Producción
# Usar una imagen Alpine Linux para un tamaño final más pequeño.
# Asegúrate que la versión de Node.js sea compatible con tus dependencias.
# Node.js 20.x LTS es una buena opción para mayo de 2025.
FROM node:20-alpine AS production

LABEL maintainer="tu-nombre <tu-email@example.com>"
LABEL version="1.0.0"
LABEL description="Backend para la aplicación de administración y visualización."

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3001 # El puerto en el que tu aplicación Express escucha DENTRO del contenedor

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar solo dependencias de producción.
# --ignore-scripts puede ser útil si alguna dependencia tiene scripts post-install problemáticos en Alpine.
# --prefer-offline intentará usar el caché local si está disponible.
RUN npm install --only=production --ignore-scripts --prefer-offline

# Copiar el resto del código de la aplicación
# Es mejor copiar package*.json e instalar dependencias ANTES de copiar el resto del código
# para aprovechar el caché de capas de Docker si solo cambias tu código y no las dependencias.
COPY . .

# Si tienes una carpeta 'uploads' que debe existir (para almacenamiento local de fallback)
# RUN mkdir -p uploads && chown node:node uploads
# Nota: La persistencia de 'uploads' debe manejarse con volúmenes en Easypanel.

# Exponer el puerto en el que la aplicación se ejecuta DENTRO del contenedor.
# Easypanel se encargará de mapear este puerto a un puerto en el host.
EXPOSE ${PORT}

# Usuario no-root para mayor seguridad
# La imagen base node:alpine crea un usuario 'node'.
USER node

# Comando para iniciar la aplicación.
# Asegúrate que "server.js" sea tu punto de entrada principal.
CMD ["node", "server.js"]
