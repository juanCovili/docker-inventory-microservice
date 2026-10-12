/**
 * Servicio de Dominio: Gestión de Inventario, Rotación FIFO y Alertas de Stock Crítico.
 * Autor: Juan Andrés Covili Cabezas
 *
 * Implementa lógica real de bodega y operaciones:
 * 1. Descuento automático por lotes según fecha de vencimiento/ingreso (FIFO / FEFO).
 * 2. Detección de quiebre de stock y punto de reorden (ROP).
 * 3. Valorización contable del inventario en tiempo real.
 */

class InventoryService {
  constructor() {
    this.items = [
      {
        sku: "SKU-LAC-001",
        name: "Leche Entera 1L (Lote Refrigerado)",
        category: "Lácteos / Perecibles",
        unitCost: 950,
        unitPrice: 1390,
        minStock: 40,
        batches: [
          { batchId: "LOTE-2026-01", quantity: 25, entryDate: "2026-10-01", expiryDate: "2026-10-20" },
          { batchId: "LOTE-2026-02", quantity: 50, entryDate: "2026-10-08", expiryDate: "2026-11-05" }
        ]
      },
      {
        sku: "SKU-ABA-002",
        name: "Aceite Vegetal 900ml",
        category: "Abarrotes",
        unitCost: 1450,
        unitPrice: 2190,
        minStock: 30,
        batches: [
          { batchId: "LOTE-2026-03", quantity: 18, entryDate: "2026-09-15", expiryDate: "2027-03-15" }
        ]
      },
      {
        sku: "SKU-FAR-003",
        name: "Suero Fisiológico 500ml",
        category: "Insumos Clínicos",
        unitCost: 1200,
        unitPrice: 2500,
        minStock: 25,
        batches: [
          { batchId: "LOTE-2026-04", quantity: 12, entryDate: "2026-09-01", expiryDate: "2026-12-01" },
          { batchId: "LOTE-2026-05", quantity: 30, entryDate: "2026-10-02", expiryDate: "2027-04-01" }
        ]
      },
      {
        sku: "SKU-LOG-004",
        name: "Film Stretch Embalaje Pallet 50cm",
        category: "Logística y Bodega",
        unitCost: 6800,
        unitPrice: 9900,
        minStock: 15,
        batches: [
          { batchId: "LOTE-2026-06", quantity: 8, entryDate: "2026-09-20", expiryDate: "2029-12-31" }
        ]
      }
    ];

    this.movements = [];
  }

  /**
   * Calcula el stock total sumando los lotes activos de un SKU.
   */
  getTotalStock(item) {
    return item.batches.reduce((sum, b) => sum + b.quantity, 0);
  }

  /**
   * Retorna el catálogo completo con métricas calculadas de stock, estado y valorización.
   */
  getAllInventory() {
    return this.items.map((item) => {
      const totalStock = this.getTotalStock(item);
      const isCritical = totalStock < item.minStock;
      return {
        ...item,
        totalStock,
        inventoryValueCost: totalStock * item.unitCost,
        inventoryValueRetail: totalStock * item.unitPrice,
        status: totalStock === 0 ? "SIN_STOCK" : isCritical ? "STOCK_CRITICO" : "OPTIMO"
      };
    });
  }

  /**
   * Filtra únicamente los productos en estado crítico (bajo el stock mínimo).
   */
  getCriticalAlerts() {
    return this.getAllInventory().filter((item) => item.status !== "OPTIMO");
  }

  /**
   * Ejecuta salida de mercadería aplicando estrictamente rotación FIFO
   * (consume primero los lotes con fecha de ingreso más antigua).
   */
  consumeFifo(sku, requestedQty, reason = "VENTA_O_DESPACHO") {
    if (!requestedQty || requestedQty <= 0) {
      throw new Error("La cantidad solicitada debe ser mayor a 0.");
    }

    const item = this.items.find((i) => i.sku === sku);
    if (!item) {
      throw new Error(`SKU no encontrado: ${sku}`);
    }

    const available = this.getTotalStock(item);
    if (available < requestedQty) {
      throw new Error(`Stock insuficiente para ${sku}. Disponible: ${available}, Solicitado: ${requestedQty}`);
    }

    // Ordenar lotes por fecha de ingreso ascendente (FIFO: First-In, First-Out)
    item.batches.sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));

    let remainingToConsume = requestedQty;
    const affectedBatches = [];

    for (const batch of item.batches) {
      if (remainingToConsume === 0) break;
      if (batch.quantity === 0) continue;

      const deducted = Math.min(batch.quantity, remainingToConsume);
      batch.quantity -= deducted;
      remainingToConsume -= deducted;

      affectedBatches.push({
        batchId: batch.batchId,
        deducted,
        remainingInBatch: batch.quantity,
        entryDate: batch.entryDate
      });
    }

    // Limpiar lotes agotados
    item.batches = item.batches.filter((b) => b.quantity > 0);

    const movement = {
      id: `MOV-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sku,
      productName: item.name,
      quantityConsumed: requestedQty,
      reason,
      affectedBatches,
      remainingTotalStock: this.getTotalStock(item)
    };

    this.movements.unshift(movement);
    return movement;
  }

  /**
   * Resumen financiero y operativo para el endpoint de métricas.
   */
  getMetrics() {
    const all = this.getAllInventory();
    const totalSkus = all.length;
    const totalUnits = all.reduce((acc, i) => acc + i.totalStock, 0);
    const totalValuationCost = all.reduce((acc, i) => acc + i.inventoryValueCost, 0);
    const criticalCount = all.filter((i) => i.status !== "OPTIMO").length;

    return {
      totalSkus,
      totalUnits,
      totalValuationCost,
      criticalCount,
      movementsCount: this.movements.length
    };
  }
}

module.exports = { InventoryService };
