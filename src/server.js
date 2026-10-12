/**
 * Servidor HTTP REST para el Microservicio Contenerizado de Inventario.
 * Expone endpoints JSON, Healthcheck para Docker/Kubernetes y Dashboard interactivo.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { InventoryService } = require("./inventoryService");

const PORT = process.env.PORT || 8080;
const APP_ENV = process.env.NODE_ENV || "production";
const inventoryService = new InventoryService();
const startTime = Date.now();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload, null, 2));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Endpoint de Healthcheck (usado por Docker HEALTHCHECK y balanceadores)
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      status: "UP",
      service: "docker-inventory-microservice",
      environment: APP_ENV,
      containerHostname: os.hostname(),
      platform: `${os.type()} ${os.arch()}`,
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    });
  }

  // 2. Listar inventario completo y lotes FIFO
  if (req.method === "GET" && url.pathname === "/api/inventory") {
    return sendJson(res, 200, {
      count: inventoryService.items.length,
      metrics: inventoryService.getMetrics(),
      items: inventoryService.getAllInventory(),
      recentMovements: inventoryService.movements.slice(0, 10)
    });
  }

  // 3. Consultar alertas de quiebre de stock (bajo mínimo)
  if (req.method === "GET" && url.pathname === "/api/inventory/alerts") {
    const alerts = inventoryService.getCriticalAlerts();
    return sendJson(res, 200, {
      alertCount: alerts.length,
      alerts
    });
  }

  // 4. Registrar salida de stock aplicando algoritmo FIFO
  if (req.method === "POST" && url.pathname === "/api/inventory/consume-fifo") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const { sku, quantity, reason } = JSON.parse(body || "{}");
        const movement = inventoryService.consumeFifo(sku, Number(quantity), reason);
        return sendJson(res, 200, {
          message: "Extracción FIFO procesada exitosamente",
          movement
        });
      } catch (err) {
        return sendJson(res, 400, {
          error: "Error en operación FIFO",
          detail: err.message
        });
      }
    });
    return;
  }

  // 5. Servir el Dashboard Interactivo en la raíz (/)
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    const htmlPath = path.join(__dirname, "..", "docs", "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(htmlPath, "utf-8"));
    }
  }

  return sendJson(res, 404, { error: "Ruta no encontrada", path: url.pathname });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[Docker Inventory Microservice] Escuchando en http://0.0.0.0:${PORT} (env: ${APP_ENV})`);
  });
}

module.exports = { server };
