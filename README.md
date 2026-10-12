# 🐳 Docker Inventory & FIFO Microservice

Microservicio REST de **Control de Inventario, Rotación por Lotes (FIFO) y Alertas de Quiebre de Stock**, empaquetado mediante **Docker Multi-Stage**, con usuario sin privilegios (`non-root`), monitoreo nativo (`HEALTHCHECK`), orquestación con `docker-compose` y pipeline de Integración Continua (`CI/CD`) en **GitHub Actions**.

---

## 🎯 Propósito del Proyecto

En entornos reales de logística, retail y salud, el inventario no es un único número estático: cada producto ingresa en **lotes con fechas de entrada y vencimiento**. Este microservicio resuelve:
1. **Algoritmo de Rotación FIFO (*First-In, First-Out*):** Al despachar mercadería, el servicio descuenta automáticamente las unidades desde los lotes más antiguos primero, evitando mermas por vencimiento.
2. **Detección de Stock Crítico:** Monitorea en tiempo real qué SKUs caen por debajo de su punto mínimo de reorden (`minStock`).
3. **Valorización Contable:** Calcula el valor del inventario a costo y a precio de venta en tiempo real.
4. **Contenerización de Grado Productivo:** Demuestra cómo empaquetar un servicio backend reproducible, ligero y seguro con Docker.

---

## 🏗️ Arquitectura del `Dockerfile` Multi-Stage

A diferencia de un contenedor básico de "Hola Mundo", este proyecto utiliza una arquitectura **Multi-Stage** en [`Dockerfile`](./Dockerfile):

1. **Etapa 1 (`tester`):**
   - Usa la imagen ligera `node:20-alpine`.
   - Copia el código fuente y ejecuta `npm test` (pruebas unitarias automatizadas con `node:test`).
   - **Garantía de calidad:** Si una sola prueba de rotación FIFO falla, el proceso de construcción de la imagen se detiene inmediatamente.
2. **Etapa 2 (`production`):**
   - Parte desde una imagen `node:20-alpine` limpia.
   - Copia únicamente los artefactos de producción (excluyendo archivos de prueba y metadatos de Git gracias a `.dockerignore`).
   - Aplica **seguridad DevSecOps** cambiando al usuario sin privilegios `USER node`.
   - Configura `HEALTHCHECK` para verificar cada 30 segundos que el endpoint `/api/health` responda `HTTP 200`.

---

## 🚀 Endpoints Principales de la API REST

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado de salud del contenedor, uptime, arquitectura y hostname. |
| `GET` | `/api/inventory` | Catálogo completo con lotes FIFO activos, valorización y métricas. |
| `GET` | `/api/inventory/alerts` | Lista de SKUs en estado de **Stock Crítico** (bajo el mínimo). |
| `POST` | `/api/inventory/consume-fifo` | Descuenta unidades aplicando rotación FIFO automática entre lotes. |

---

## 🛠️ Cómo Ejecutar el Proyecto

### Opción A: Con Docker (Recomendado)
```bash
# 1. Construir la imagen multi-stage (ejecuta los tests automáticamente en la Etapa 1)
docker build -t docker-inventory-microservice .

# 2. Levantar el contenedor en el puerto 8080
docker run -d -p 8080:8080 --name inventory-service docker-inventory-microservice

# 3. O usando Docker Compose:
docker compose up --build -d
```

### Opción B: Con Node.js Local (Sin dependencias externas)
```bash
# Ejecutar suite de pruebas unitarias
npm test

# Iniciar el servidor en http://localhost:8080
npm start
```

---

## 📚 Guía Rápida de Docker para Entrevistas Técnicas

* **¿Qué diferencia hay entre una Imagen y un Contenedor?**
  * La **Imagen** es el paquete inmutable (la "plantilla" o clase compilada creada con `docker build`).
  * El **Contenedor** es la instancia en ejecución de esa imagen (creada con `docker run`).
* **¿Por qué usaste un `Dockerfile` Multi-Stage?**
  * Para separar la etapa de validación/pruebas (`tester`) de la etapa de ejecución (`production`). Así garantizo que nunca se genere una imagen de producción si fallan los tests unitarios, y mantengo la imagen final liviana y limpia.
* **¿Por qué incluiste `USER node` y `HEALTHCHECK`?**
  * Por defecto los contenedores corren como `root`, lo cual es un riesgo de seguridad si el servicio es vulnerado. Con `USER node` limito los privilegios. Y `HEALTHCHECK` permite a Docker o Kubernetes saber si la aplicación realmente responde peticiones HTTP, no solo si el proceso sigue encendido.

---
**Autor:** Juan Andrés Covili Cabezas — Ingeniero en Informática (INACAP).
