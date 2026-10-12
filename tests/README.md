# 🧪 Suite de Pruebas Automatizadas (`node:test`)

Este directorio contiene las pruebas unitarias del microservicio **Docker Inventory & FIFO Service**.

> **Integración con Docker Multi-Stage:**  
> Durante el comando `docker build`, la **Etapa 1 (`tester`)** del [`Dockerfile`](../Dockerfile) ejecuta automáticamente `npm test`. Si cualquiera de estas pruebas falla, la construcción de la imagen se detiene para impedir que código defectuoso llegue a producción.

---

## 📋 Casos de Prueba (`inventory.test.js`)

1. **Cálculo de Stock Agregado y Detección de Alertas Críticas:**
   - Verifica que el stock total de cada SKU corresponda a la suma exacta de sus lotes activos y que los productos bajo `minStock` se marquen como `STOCK_CRITICO`.
2. **Descuento Estricto por Orden FIFO (*First-In, First-Out*):**
   - Verifica que al solicitar una salida de mercadería que supera el primer lote (`30 unidades` de `SKU-LAC-001`), el algoritmo agote primero las `25 unidades` del lote más antiguo (`LOTE-2026-01`) y descuente las `5 unidades` restantes del siguiente lote (`LOTE-2026-02`).
3. **Protección contra Quiebre de Stock (Stock Negativo):**
   - Verifica que el servicio rechace cualquier extracción superior al stock disponible lanzando una excepción controlada.

---

## ▶️ Cómo Ejecutar las Pruebas

```bash
npm test
```
