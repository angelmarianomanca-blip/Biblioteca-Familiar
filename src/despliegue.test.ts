import * as comprobaciones from "node:assert/strict";
import { test as prueba } from "node:test";
import { readFileSync as leerArchivo, existsSync as existeArchivo } from "node:fs";
import { resolve as resolverRuta } from "node:path";
import { aplicacion } from "./api/aplicacion.js";

prueba("despliegue: render.yaml existe y tiene la configuración requerida", () => {
  const rutaRender = resolverRuta(process.cwd(), "render.yaml");
  comprobaciones.ok(existeArchivo(rutaRender), "render.yaml debe existir en la raíz del proyecto");

  const contenido = leerArchivo(rutaRender, "utf-8");
  comprobaciones.match(contenido, /type:\s*web/);
  comprobaciones.match(contenido, /env:\s*node/);
  comprobaciones.match(contenido, /buildCommand:\s*npm install && npm run build/);
  comprobaciones.match(contenido, /startCommand:\s*npm start/);
  comprobaciones.match(contenido, /TURSO_DATABASE_URL/);
  comprobaciones.match(contenido, /TURSO_AUTH_TOKEN/);
});

prueba("despliegue: Dockerfile y .dockerignore existen para Railway/Docker", () => {
  const rutaDockerfile = resolverRuta(process.cwd(), "Dockerfile");
  const rutaDockerignore = resolverRuta(process.cwd(), ".dockerignore");

  comprobaciones.ok(existeArchivo(rutaDockerfile), "Dockerfile debe existir");
  comprobaciones.ok(existeArchivo(rutaDockerignore), ".dockerignore debe existir");

  const contenidoDocker = leerArchivo(rutaDockerfile, "utf-8");
  comprobaciones.match(contenidoDocker, /FROM node:22/);
  comprobaciones.match(contenidoDocker, /npm run build/);
  comprobaciones.match(contenidoDocker, /node", "dist\/index\.js"/);
});

prueba("despliegue: Express sirve archivos estáticos y responde en la raíz", async () => {
  const servidor = aplicacion.listen(0);
  const direccion = servidor.address();
  const puerto = typeof direccion === "object" && direccion ? direccion.port : 3000;

  try {
    const resRaiz = await fetch(`http://localhost:${puerto}/`);
    comprobaciones.equal(resRaiz.status, 200);
    const html = await resRaiz.text();
    comprobaciones.match(html, /<title>BiblioTeca/i);

    const resManifest = await fetch(`http://localhost:${puerto}/manifest.json`);
    comprobaciones.equal(resManifest.status, 200);
    const json = (await resManifest.json()) as { name: string };
    comprobaciones.equal(json.name, "BiblioTeca");

    const resSw = await fetch(`http://localhost:${puerto}/sw.js`);
    comprobaciones.equal(resSw.status, 200);
    comprobaciones.equal(resSw.headers.get("service-worker-allowed"), "/");
  } finally {
    servidor.close();
  }
});
