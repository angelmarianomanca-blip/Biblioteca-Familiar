/**
 * Normaliza un texto que se guardará en la base.
 *
 * Algoritmo:
 * 1. Convierte caracteres Unicode a su forma compuesta NFC.
 * 2. Convierte finales de línea de Windows o Mac a saltos de línea Unix.
 * 3. Recorta espacios al principio y al final.
 * 4. Reduce espacios y tabulaciones repetidos sin unir párrafos.
 * 5. Limita las secuencias de más de dos saltos a una separación de párrafo.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .trim()
    .replace(/[ \t]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n");
}

/**
 * Normaliza solo las propiedades de texto indicadas y conserva el tipo de
 * entrada inferido desde Drizzle.
 */
export function normalizarCamposDeTexto<T extends object>(
  datos: T,
  campos: readonly (keyof T)[],
): T {
  // Se copia el registro para no mutar el objeto que recibió el servicio.
  const copia = { ...datos } as { -readonly [Campo in keyof T]: unknown };

  // Las propiedades que no sean texto (por ejemplo, IDs y booleanos) quedan
  // exactamente como llegaron.
  for (const campo of campos) {
    const valor = copia[campo];
    if (typeof valor === "string") {
      copia[campo] = normalizarTexto(valor);
    }
  }

  return copia as T;
}

/**
 * Normaliza recursivamente los textos dentro de estructuras JSON.
 *
 * Algoritmo: procesa cadenas con normalizarTexto, recorre cada elemento de las
 * listas, reconstruye los objetos propiedad por propiedad y deja intactos los
 * valores numéricos, booleanos y nulos.
 */
export function normalizarJson<T>(valor: T): T {
  if (typeof valor === "string") {
    return normalizarTexto(valor) as T;
  }

  if (Array.isArray(valor)) {
    return valor.map((elemento) => normalizarJson(elemento)) as T;
  }

  if (valor !== null && typeof valor === "object") {
    const entradas = Object.entries(valor).map(([clave, contenido]) => [
      clave,
      normalizarJson(contenido),
    ]);

    return Object.fromEntries(entradas) as T;
  }

  return valor;
}

/**
 * Prepara una cadena para comparaciones de búsqueda sin distinguir acentos.
 * Esta transformación solo se usa al buscar; el texto visible conserva sus
 * tildes y mayúsculas originales después de normalizarse al guardar.
 */
export function normalizarTextoParaBusqueda(texto: string): string {
  return normalizarTexto(texto)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}
