const test = require("node:test");
const assert = require("node:assert/strict");
const { InventoryService } = require("../src/inventoryService");

test("InventoryService - Calcula correctamente el stock total por lotes y detecta alertas críticas", () => {
  const service = new InventoryService();
  const all = service.getAllInventory();

  assert.equal(all.length, 4);
  const leche = all.find((i) => i.sku === "SKU-LAC-001");
  assert.equal(leche.totalStock, 75); // 25 + 50
  assert.equal(leche.status, "OPTIMO");

  const alerts = service.getCriticalAlerts();
  assert.equal(alerts.length, 2); // Aceite (18 < 30) y Film Stretch (8 < 15)
});

test("InventoryService - Consume unidades respetando estrictamente el orden FIFO (lote más antiguo primero)", () => {
  const service = new InventoryService();

  // SKU-LAC-001 tiene LOTE-2026-01 (25 uds) y LOTE-2026-02 (50 uds)
  // Si consumimos 30 unidades, debe agotar las 25 del LOTE-2026-01 y descontar 5 del LOTE-2026-02
  const movement = service.consumeFifo("SKU-LAC-001", 30, "DESPACHO_SUCURSAL");

  assert.equal(movement.quantityConsumed, 30);
  assert.equal(movement.remainingTotalStock, 45);
  assert.equal(movement.affectedBatches.length, 2);
  assert.equal(movement.affectedBatches[0].batchId, "LOTE-2026-01");
  assert.equal(movement.affectedBatches[0].deducted, 25);
  assert.equal(movement.affectedBatches[1].batchId, "LOTE-2026-02");
  assert.equal(movement.affectedBatches[1].deducted, 5);
  assert.equal(movement.affectedBatches[1].remainingInBatch, 45);
});

test("InventoryService - Lanza excepción cuando el stock es insuficiente", () => {
  const service = new InventoryService();
  assert.throws(() => {
    service.consumeFifo("SKU-LOG-004", 999);
  }, /Stock insuficiente/);
});
