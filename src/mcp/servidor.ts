import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import type { Express } from "express";
import { registrarHerramientas } from "./herramientas.js";

// El SDK crea una instancia de servidor nueva por solicitud HTTP, según el
// modelo stateless del transporte Streamable HTTP.
const controladorMcp = createMcpHandler(() => {
  const servidor = new McpServer({
    name: "biblioteca-digital",
    version: "1.0.0",
  });
  registrarHerramientas(servidor);
  return servidor;
});

// Se adapta el handler oficial al protocolo req/res que usa Express.
const atenderSolicitudMcp = toNodeHandler(controladorMcp);

/** Monta los métodos HTTP del protocolo MCP en la ruta `/mcp` de Express. */
export function montarServidorMcp(aplicacion: Express) {
  aplicacion.all("/mcp", (solicitud, respuesta, siguiente) => {
    // Express ya leyó el JSON antes de llegar a esta ruta; se pasa el cuerpo
    // parseado al adaptador para no volver a consumir el stream HTTP.
    void atenderSolicitudMcp(
      solicitud,
      respuesta,
      solicitud.body,
    ).catch(siguiente);
  });
}
