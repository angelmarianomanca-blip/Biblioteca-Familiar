import * as comprobaciones from "node:assert/strict";
import { before, test as prueba } from "node:test";
import {
  Categorias,
  Examenes,
  Libros,
  Progreso,
  Recordatorios,
  Usuarios,
} from "./index.js";
import { conexionCompartida } from "../db/instancia.js";
import { asegurarEsquemaYDatos } from "../db/inicializar.js";
import { aplicacion } from "../api/aplicacion.js";

before(async () => {
  const conexion = await conexionCompartida;
  await asegurarEsquemaYDatos(conexion);
});

prueba("perfiles de usuario: lista los dos usuarios por defecto", async function probarListadoUsuarios() {
  const lista = await Usuarios.listar();
  comprobaciones.ok(lista.length >= 2, "Debe haber al menos 2 usuarios sembrados");

  const lector1 = lista.find((u) => u.id === 1);
  const lector2 = lista.find((u) => u.id === 2);

  comprobaciones.ok(lector1, "Debe existir Lector 1");
  comprobaciones.equal(lector1.nombre, "Lector 1");
  comprobaciones.equal(lector1.avatarColor, "#e2b04a");
  comprobaciones.equal(lector1.rol, "admin");

  const esAdmin1 = await Usuarios.esAdmin(1);
  comprobaciones.equal(esAdmin1, true, "Lector 1 debe ser admin");

  comprobaciones.ok(lector2, "Debe existir Lector 2");
  comprobaciones.equal(lector2.nombre, "Lector 2");
  comprobaciones.equal(lector2.avatarColor, "#6179c9");
  comprobaciones.equal(lector2.rol, "lector");

  const esAdmin2 = await Usuarios.esAdmin(2);
  comprobaciones.equal(esAdmin2, false, "Lector 2 debe ser lector");
});

prueba("perfiles de usuario: progreso independiente por usuarioId", async function probarProgresoPorUsuario() {
  const progresoLector1 = await Progreso.obtenerPorLibro(1, 1);
  const progresoLector2 = await Progreso.obtenerPorLibro(1, 2);

  comprobaciones.ok(progresoLector1, "Lector 1 debe tener progreso en Libro 1");
  comprobaciones.ok(progresoLector2, "Lector 2 debe tener progreso en Libro 1");

  comprobaciones.equal(progresoLector1.usuarioId, 1);
  comprobaciones.equal(progresoLector2.usuarioId, 2);
  comprobaciones.notEqual(
    progresoLector1.porcentaje,
    progresoLector2.porcentaje,
    "Los dos lectores deben tener porcentajes independientes",
  );
});

prueba("perfiles de usuario: historial de exámenes vinculado a usuarioId", async function probarHistorialExamenesPorUsuario() {
  const historial1 = await Examenes.historialPorLibro(1, 1);
  const historial2 = await Examenes.historialPorLibro(1, 2);

  comprobaciones.ok(Array.isArray(historial1));
  comprobaciones.ok(Array.isArray(historial2));

  // Cada intento debe pertenecer al usuario consultado
  for (const fila of historial1) {
    comprobaciones.equal(fila.resultado.usuarioId, 1);
  }
  for (const fila of historial2) {
    comprobaciones.equal(fila.resultado.usuarioId, 2);
  }
});

prueba("perfiles de usuario: recordatorios vinculados a usuarioId", async function probarRecordatoriosPorUsuario() {
  const recLector1 = await Recordatorios.listar(undefined, 1);
  const recLector2 = await Recordatorios.listar(undefined, 2);

  comprobaciones.ok(recLector1.length > 0, "Lector 1 debe tener recordatorios");
  for (const r of recLector1) {
    comprobaciones.equal(r.usuarioId, 1);
  }

  comprobaciones.ok(recLector2.length > 0, "Lector 2 debe tener recordatorios");
  for (const r of recLector2) {
    comprobaciones.equal(r.usuarioId, 2);
  }
});

prueba("roles: operaciones CRUD y comprobación de permisos", async function probarCrudUsuarios() {
  // Crear usuario con rol explícito
  const nuevoAdmin = await Usuarios.crear({
    nombre: "Test Admin",
    avatarColor: "#48bb78",
    rol: "admin",
  });
  comprobaciones.ok(nuevoAdmin.id, "Debe generar ID");
  comprobaciones.equal(nuevoAdmin.rol, "admin");
  comprobaciones.equal(await Usuarios.esAdmin(nuevoAdmin.id), true);

  const nuevoLector = await Usuarios.crear({
    nombre: "Test Lector",
    avatarColor: "#ed8936",
    rol: "lector",
  });
  comprobaciones.equal(nuevoLector.rol, "lector");
  comprobaciones.equal(await Usuarios.esAdmin(nuevoLector.id), false);

  // Actualizar usuario
  const actualizado = await Usuarios.actualizar(nuevoLector.id, {
    nombre: "Lector Promovido",
    rol: "admin",
  });
  comprobaciones.equal(actualizado?.nombre, "Lector Promovido");
  comprobaciones.equal(actualizado?.rol, "admin");
  comprobaciones.equal(await Usuarios.esAdmin(nuevoLector.id), true);

  // Eliminar usuario
  const eliminado1 = await Usuarios.eliminar(nuevoAdmin.id);
  const eliminado2 = await Usuarios.eliminar(nuevoLector.id);
  comprobaciones.equal(eliminado1, true);
  comprobaciones.equal(eliminado2, true);
});

prueba("roles y permisos en API: eliminación y creación según rol", async () => {
  const servidor = aplicacion.listen(0);
  const direccion = servidor.address();
  const puerto = typeof direccion === "object" && direccion ? direccion.port : 3000;
  const baseUrl = `http://localhost:${puerto}/api`;

  try {
    // 1. Crear categoría y libro de prueba usando admin (usuario 1)
    const resCat = await fetch(`${baseUrl}/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Usuario-Id": "1" },
      body: JSON.stringify({
        nombre: "Categoría de Prueba",
        descripcion: "Para pruebas de eliminación",
        icono: "🧪",
      }),
    });
    comprobaciones.equal(resCat.status, 201);
    const catData = (await resCat.json()) as { id: number };

    const resLibro = await fetch(`${baseUrl}/libros`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Usuario-Id": "1" },
      body: JSON.stringify({
        categoriaId: catData.id,
        titulo: "Libro de Prueba Para Eliminar",
        autor: "Autor Test",
        portadaUrl: "",
        descripcion: "Descripción de prueba",
        contenidoCompleto: "--- PÁGINA 1: Inicio ---\nContenido de prueba",
        totalPaginas: 1,
      }),
    });
    comprobaciones.equal(resLibro.status, 201);
    const libroData = (await resLibro.json()) as { id: number; portadaUrl: string };
    comprobaciones.ok(libroData.portadaUrl.length > 0, "Debe asignar portadaUrl por defecto si viene vacía");

    // 2. Intentar eliminar el libro como lector (usuario 2) -> debe devolver 403 Forbidden
    const resEliminarLector = await fetch(`${baseUrl}/libros/${libroData.id}`, {
      method: "DELETE",
      headers: { "X-Usuario-Id": "2" },
    });
    comprobaciones.equal(resEliminarLector.status, 403, "Lector no debe poder eliminar libros");

    // 3. Intentar eliminar la categoría como lector (usuario 2) -> debe devolver 403 Forbidden
    const resEliminarCatLector = await fetch(`${baseUrl}/categorias/${catData.id}`, {
      method: "DELETE",
      headers: { "X-Usuario-Id": "2" },
    });
    comprobaciones.equal(resEliminarCatLector.status, 403, "Lector no debe poder eliminar categorías");

    // 4. Eliminar el libro como admin (usuario 1) -> debe devolver 204
    const resEliminarAdmin = await fetch(`${baseUrl}/libros/${libroData.id}`, {
      method: "DELETE",
      headers: { "X-Usuario-Id": "1" },
    });
    comprobaciones.equal(resEliminarAdmin.status, 204, "Admin debe poder eliminar libros");

    // 5. Eliminar la categoría como admin (usuario 1) -> debe devolver 204
    const resEliminarCatAdmin = await fetch(`${baseUrl}/categorias/${catData.id}`, {
      method: "DELETE",
      headers: { "X-Usuario-Id": "1" },
    });
    comprobaciones.equal(resEliminarCatAdmin.status, 204, "Admin debe poder eliminar categorías");
  } finally {
    servidor.close();
  }
});

prueba("PDF upload: documento extenso de cientos de páginas se procesa sin error interno (50MB body)", async () => {
  const servidor = aplicacion.listen(0);
  const direccion = servidor.address();
  const puerto = typeof direccion === "object" && direccion ? direccion.port : 3000;
  const baseUrl = `http://localhost:${puerto}/api`;

  try {
    // Generar un contenido extenso simulando 250 páginas extraídas de un PDF (más de 300 KB de texto)
    const paginasExtensas: string[] = [];
    for (let p = 1; p <= 250; p++) {
      paginasExtensas.push(
        `--- PÁGINA ${p}: Capítulo ${p} ---\n` +
          `Este es un texto extenso representativo de la página ${p} de un documento PDF. ` +
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(25),
      );
    }
    const contenidoExtenso = paginasExtensas.join("\n\n");
    comprobaciones.ok(
      contenidoExtenso.length > 250000,
      "El texto debe superar los 200KB para validar que excede el límite estándar de 100KB",
    );

    const respuesta = await fetch(`${baseUrl}/libros`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Usuario-Id": "1" },
      body: JSON.stringify({
        categoriaId: 1,
        titulo: "Documento PDF Extenso de Prueba",
        autor: "Autor del PDF",
        portadaUrl: "",
        descripcion: "Documento importado con cientos de páginas.",
        contenidoCompleto: contenidoExtenso,
        totalPaginas: 250,
      }),
    });

    comprobaciones.equal(
      respuesta.status,
      201,
      "Debe devolver 201 Created sin error 413 o 500 de servidor",
    );
    const libroCreado = (await respuesta.json()) as { id: number; totalPaginas: number };
    comprobaciones.equal(libroCreado.totalPaginas, 250);

    // Limpiar libro de prueba
    await Libros.eliminar(libroCreado.id);
  } finally {
    servidor.close();
  }
});
