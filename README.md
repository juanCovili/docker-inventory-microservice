# 🐳 Docker Inventory & FIFO Microservice

[![Docker](https://img.shields.io/badge/Docker-Multi--Stage_(node:20--alpine)-2496ED?logo=docker&logoColor=white)](./Dockerfile)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](./.github/workflows/ci-cd.yml)
[![Tests](https://img.shields.io/badge/Unit_Tests-3%2F3_Passing_(node:test)-22c55e)](./tests)
[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-0ea5e9?logo=github)](https://juancovili.github.io/docker-inventory-microservice/)

> Microservicio REST de **Control de Inventario, Rotación por Lotes (`FIFO: First-In, First-Out`), Alertas de Quiebre de Stock y Valorización Contable**, empaquetado mediante **Dockerfile Multi-Stage**, ejecución segura sin privilegios (`USER node`), monitoreo nativo (`HEALTHCHECK`), orquestación con `docker-compose` y pipeline `CI/CD` en **GitHub Actions**.

🔗 **[Probar Consola Interactiva del Microservicio en Vivo (GitHub Pages)](https://juancovili.github.io/docker-inventory-microservice/)**

![Vista Previa del Microservicio Docker](./docs/preview.svg)

---

## 🏗️ Pipeline de Contenerización Multi-Stage & CI/CD

El [`Dockerfile`](./Dockerfile) implementa dos etapas aisladas para garantizar que ninguna imagen de producción se construya si falla una prueba unitaria del algoritmo FIFO:

```mermaid
flowchart LR
    subgraph GitHubActions ["Pipeline CI/CD (.github/workflows/ci-cd.yml)"]
        G1["git push origin main"] --> G2["Stage 1: node:20-alpine AS tester\nEjecuta: RUN npm test"]
        G2 -->|3/3 Tests PASS| G3["Stage 2: node:20-alpine AS production\nUSER node (non-root) + HEALTHCHECK"]
        G3 --> G4["Smoke Test Contenedor\nGET http://localhost:8080/api/health"]
    end
```

### Flujo de Extracción por Lotes (`Algoritmo FIFO`)

```mermaid
sequenceDiagram
    participant Client as Cliente / Bodega
    participant API as POST /api/inventory/consume-fifo
    participant Service as InventoryService (FIFO Engine)

    Client->>API: {"sku": "SKU-LAC-001", "quantity": 30}
    API->>Service: consumeFifo("SKU-LAC-001", 30)
    Note over Service: Ordena lotes por fecha de ingreso ascendente:<br/>1) LOTE-2026-01 (25 uds, 01/Oct)<br/>2) LOTE-2026-02 (50 uds, 08/Oct)
    Service->>Service: Agota 25 uds de LOTE-2026-01 (queda en 0 y se limpia)
    Service->>Service: Descuenta las 5 uds restantes de LOTE-2026-02 (queda en 45)
    Service-->>API: Movimiento auditado + lotes afectados + nuevo stock (45 uds)
    API-->>Client: HTTP 200 OK (JSON)
```

---

## 🧪 Suite de Pruebas Automatizadas ([`/tests`](./tests))

Las pruebas unitarias se encuentran en [`/tests/inventory.test.js`](./tests/inventory.test.js) y se ejecutan sin dependencias pesadas mediante el runner nativo `node:test`:

| # | Caso de Prueba | Qué verifica | Estado |
| :--- | :--- | :--- | :---: |
| **1** | `Calcula correctamente el stock total por lotes y detecta alertas críticas` | Suma de lotes por SKU, valorización contable a costo/venta y detección de SKUs con `totalStock < minStock`. | ✅ PASS |
| **2** | `Consume unidades respetando estrictamente el orden FIFO` | Descuento multi-lote: al pedir 30 uds cuando el lote más antiguo tiene 25 uds, consume las 25 del primer lote y 5 del segundo. | ✅ PASS |
| **3** | `Lanza excepción cuando el stock es insuficiente` | Prevención de quiebre negativo de inventario (`Stock insuficiente`). | ✅ PASS |

```bash
# Ejecutar pruebas localmente
npm test
```

---

## 📡 Endpoints de la API REST

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado de salud del contenedor (`UP`), hostname, arquitectura y uptime. |
| `GET` | `/api/inventory` | Catálogo completo con lotes FIFO activos, valorización y métricas. |
| `GET` | `/api/inventory/alerts` | Lista filtrada de SKUs en estado de **Stock Crítico**. |
| `POST` | `/api/inventory/consume-fifo` | Ejecuta salida de mercadería descontando desde los lotes más antiguos. |

---

## 🛠️ Cómo Ejecutar con Docker

```bash
# Construir imagen Multi-Stage y levantar con Docker Compose
docker compose up --build -d

# Verificar salud del contenedor
curl http://localhost:8080/api/health
```

---

## 👨‍💻 Autor

**Juan Covili**  
*Ingeniero en Informática / Analista Programador (INACAP)*  
* [LinkedIn](https://www.linkedin.com/in/juan-covili-59b935241/) · [GitHub](https://github.com/juanCovili) · [Portafolio Web](https://www.juancovili.com)
