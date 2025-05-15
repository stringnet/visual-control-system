# admin-frontend/Dockerfile

# --- Etapa de Construcción (Build Stage) ---
# Usamos una versión LTS de Node.js. Alpine es para una imagen más ligera.
FROM node:20-alpine AS builder

# Establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
# Esto aprovecha el caché de Docker: si estos archivos no cambian,
# no se reinstalarán las dependencias innecesariamente.
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm install

# Copiar el resto del código fuente de la aplicación
COPY . .

# Variable de entorno para la URL de la API (se puede pasar en el build)
# Easypanel te permitirá configurar Build Arguments o Environment Variables para el build.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_SOCKET_URL
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

# Ejecutar el script de build (definido en package.json)
# Esto generará los archivos estáticos en la carpeta /app/dist
RUN npm run build

# --- Etapa de Producción (Production Stage) ---
# Usar una imagen ligera de Nginx para servir los archivos estáticos
FROM nginx:stable-alpine

# Eliminar la configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nuestra configuración personalizada de Nginx (nginx.conf)
# Crearemos este archivo a continuación.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos estáticos construidos desde la etapa 'builder'
# desde /app/dist (donde Vite los coloca) a la carpeta raíz de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80 (Nginx escucha en este puerto por defecto)
EXPOSE 80

# Comando para iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
