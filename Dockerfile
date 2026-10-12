# ==============================================================================
# ETAPA 1: Validación y Pruebas Automatizadas (Builder / Tester Stage)
# ==============================================================================
FROM node:20-alpine AS tester

WORKDIR /usr/src/app

# Copiar manifiestos y código fuente para validar tests antes de empaquetar
COPY package.json ./
COPY src ./src
COPY tests ./tests

# Ejecutar pruebas unitarias; si un test falla, la imagen Docker NO se construye
RUN npm test

# ==============================================================================
# ETAPA 2: Imagen de Producción Ligera y Segura (Production Stage)
# ==============================================================================
FROM node:20-alpine AS production

# Metadatos OCI estándar
LABEL maintainer="Juan Covili"
LABEL org.opencontainers.image.title="docker-inventory-microservice"
LABEL org.opencontainers.image.description="Microservicio REST de Control de Inventario FIFO con Dockerfile Multi-Stage"
LABEL org.opencontainers.image.version="1.0.0"

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /usr/src/app

# Copiar únicamente artefactos necesarios desde la etapa previa
COPY --from=tester /usr/src/app/package.json ./
COPY --from=tester /usr/src/app/src ./src
COPY docs ./docs

# Buenas prácticas de seguridad DevSecOps: ejecutar con usuario sin privilegios (non-root)
USER node

# Exponer puerto del servicio HTTP
EXPOSE 8080

# Monitoreo nativo de salud del contenedor cada 30 segundos
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Comando de inicio
CMD ["node", "src/server.js"]
