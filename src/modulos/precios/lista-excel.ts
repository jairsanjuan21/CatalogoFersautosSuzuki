/* ============================================================================
   LISTA DE PRECIOS DE SUZUKI EN EXCEL
   Lee el .xlsx que Suzuki le manda a Fersautos cada mes (una hoja por
   combustible, con columnas "Modelo", "Precio Referencia" y "Precio Venta
   Público") y lo empareja con el catálogo. Todo es determinista: sin IA,
   sin costo y sin errores de lectura. Natalia siempre revisa antes de publicar.

   Las funciones de este archivo son puras (no tocan la base de datos) para
   poder probarlas con el Excel real. La lectura del archivo está en leerExcel().
   ========================================================================== */

export const LIMITE_BYTES = 2 * 1024 * 1024;
export const PRECIO_MINIMO = 10_000_000;
export const PRECIO_MAXIMO = 2_000_000_000;

export type Celda = string | number | null;
export type Combustible = "gasolina" | "hibrido" | "electrico";
export type Transmision = "mecanica" | "automatica";

export interface FilaLista {
  hoja: string;
  fila: number; // número de fila en Excel, para que Natalia la ubique
  codigo: string | null;
  anio: number | null;
  texto: string; // "JIMNY 5P GLX MT (Particular y Especial)", tal como viene
  referencia: number; // "Precio Referencia": el precio base de la versión
  venta: number; // "Precio Venta Público": el precio del día
  nuevoPrecio: boolean; // la lista lo marca como "Nuevo precio"
  combustible: Combustible | null;
  categoria: "automovil" | "camioneta" | null;
}

export interface Lista {
  numero: string | null;
  fecha: string | null; // AAAA-MM-DD
  vigenteHasta: string | null;
  filas: FilaLista[];
  descartadas: { texto: string; motivo: string }[];
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES = `(${MESES.join("|")}|setiembre)`;

/** "06 de noviembre de 2026", "30 de noviembre 2026" o "Noviembre 06 de 2026" → "2026-11-06" */
export function fechaDeTexto(texto: string): string | null {
  const t = texto.toLowerCase();
  const a = t.match(new RegExp(`(\\d{1,2})\\s+de\\s+${MES}\\s+(?:de\\s+|del\\s+)?(\\d{4})`));
  const b = t.match(new RegExp(`${MES}\\s+(\\d{1,2})\\s+de\\s+(\\d{4})`));
  const [dia, mes, anio] = a ? [a[1], a[2], a[3]] : b ? [b[2], b[1], b[3]] : [];
  if (!dia || !mes || !anio) return null;
  const m = mes === "setiembre" ? 9 : MESES.indexOf(mes) + 1;
  const d = Number(dia);
  const fecha = new Date(Date.UTC(Number(anio), m - 1, d));
  if (fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null; // 31 de noviembre, etc.
  return fecha.toISOString().slice(0, 10);
}

const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, "");

const combustibleDe = (t: string): Combustible | null =>
  /h[ií]brid/i.test(t) ? "hibrido" : /el[eé]ctric/i.test(t) ? "electrico" : /gasolina/i.test(t) ? "gasolina" : null;
const categoriaDe = (t: string) => (/camioneta/i.test(t) ? "camioneta" : /autom[oó]vil/i.test(t) ? "automovil" : null);
const comoTexto = (c: Celda) => (c === null ? "" : String(c).replace(/\s+/g, " ").trim());

interface Columnas {
  codigo: number;
  anio: number;
  modelo: number;
  referencia: number;
  venta: number;
}

function columnasDe(fila: Celda[]): Columnas | null {
  const busca = (re: RegExp) => fila.findIndex((c) => typeof c === "string" && re.test(c.trim()));
  const col = {
    codigo: busca(/^c[oó]digo/i),
    anio: busca(/^a[ñn]o/i),
    modelo: busca(/^modelo\s*$/i),
    referencia: busca(/precio\s+referencia/i),
    venta: busca(/precio\s+venta/i),
  };
  return col.modelo >= 0 && col.referencia >= 0 && col.venta >= 0 ? col : null;
}

/** Interpreta las hojas ya convertidas en filas de celdas. Función pura. */
export function interpretarHojas(hojas: { nombre: string; filas: Celda[][] }[]): Lista {
  const lista: Lista = { numero: null, fecha: null, vigenteHasta: null, filas: [], descartadas: [] };
  const vistos = new Set<string>();

  for (const hoja of hojas) {
    let columnas: Columnas | null = null;
    let combustible = combustibleDe(hoja.nombre);
    let categoria: FilaLista["categoria"] = null;

    hoja.filas.forEach((fila, i) => {
      // Las celdas combinadas repiten su valor en cada celda: se cuentan una vez
      const textos = [...new Set(fila.map(comoTexto).filter(Boolean))];
      if (!textos.length) return;
      const unido = textos.join(" ");

      // Encabezado de la lista: número, fecha y vigencia
      lista.numero ??= unido.match(/lista\s+de\s+precios\s+n[oº°.]*\s*(\d+)/i)?.[1] ?? null;
      if (!lista.vigenteHasta && /vigente\s+hasta/i.test(unido)) lista.vigenteHasta = fechaDeTexto(unido.slice(unido.search(/vigente\s+hasta/i)));
      if (!lista.fecha && !/vigente/i.test(unido)) lista.fecha = fechaDeTexto(unido);

      const nuevas = columnasDe(fila);
      if (nuevas) {
        columnas = nuevas;
        return;
      }
      // Fila de sección ("AUTOMOVILES HIBRIDOS", "CAMIONETAS HIBRIDAS"): cambia combustible y categoría
      if (textos.length === 1 && textos[0].length < 60) {
        combustible = combustibleDe(textos[0]) ?? combustible;
        categoria = categoriaDe(textos[0]) ?? categoria;
        return;
      }
      if (!columnas) return;

      const texto = comoTexto(fila[columnas.modelo]);
      const referencia = fila[columnas.referencia];
      const venta = fila[columnas.venta];
      if (!texto || (typeof referencia !== "number" && typeof venta !== "number")) return; // notas al pie
      const enRango = (v: Celda): v is number => typeof v === "number" && Number.isInteger(v) && v >= PRECIO_MINIMO && v <= PRECIO_MAXIMO;
      if (!enRango(referencia) || !enRango(venta)) return void lista.descartadas.push({ texto, motivo: "Precio vacío o fuera de rango" });
      if (venta > referencia) return void lista.descartadas.push({ texto, motivo: "El precio de venta es mayor que el de referencia" });
      if (vistos.has(normal(texto))) return void lista.descartadas.push({ texto, motivo: "Fila repetida en la lista" });
      vistos.add(normal(texto));

      const anio = columnas.anio >= 0 ? Number(fila[columnas.anio]) : NaN;
      lista.filas.push({
        hoja: hoja.nombre,
        fila: i + 1,
        codigo: columnas.codigo >= 0 ? comoTexto(fila[columnas.codigo]) || null : null,
        anio: Number.isInteger(anio) && anio >= 2000 && anio <= 2100 ? anio : null,
        texto,
        referencia,
        venta,
        // Solo se toma la marca "Nuevo precio"; el resto de la estrategia de ventas no se usa
        nuevoPrecio: fila.some((c) => typeof c === "string" && /^\s*nuevo\s+pre/i.test(c)),
        combustible,
        categoria,
      });
    });
  }
  return lista;
}

/* ---------- del texto de la fila a línea, versión y transmisión ---------- */

const ES_VERSION = /^(\d+(\.\d+)?|\d+P|GL\+?|GLX|GLS|GA|GX|4X2|4X4|2WD|4WD|AWD|ALLGRIP|TOTAL|ADAS|EDICI[OÓ]N)$/i;
const ES_HIBRIDO = /^(HYBRID|H[IÍ]BRID[AO])$/i;
const LINEAS_CONOCIDAS: Record<string, string> = { scross: "S-Cross", spresso: "S-Presso", xl7: "XL7" };

const titulo = (s: string) => s.toLowerCase().replace(/(^|\s)\p{L}/gu, (l) => l.toUpperCase());

/** "NEW SWIFT HYBRID GL+ AT" → { linea: "Swift", version: "GL+", transmision: "automatica" } */
export function interpretarTexto(texto: string): { linea: string; version: string; transmision: Transmision | null } {
  const tokens = texto.replace(/\([^)]*\)/g, " ").split(/\s+/).filter(Boolean);
  let transmision: Transmision | null = null;
  const resto = tokens.filter((tk, i) => {
    if (i === 0 && /^new$/i.test(tk)) return false;
    if (/^MT$/i.test(tk)) return void (transmision = "mecanica"), false;
    if (/^(AT|CVT|AMT)$/i.test(tk)) return void (transmision = "automatica"), false;
    return !ES_HIBRIDO.test(tk);
  });
  const corte = resto.findIndex((tk, i) => i > 0 && ES_VERSION.test(tk));
  const lineaTokens = corte === -1 ? resto : resto.slice(0, corte);
  const versionTokens = corte === -1 ? [] : resto.slice(corte);
  const lineaCruda = lineaTokens.join(" ");
  const linea = LINEAS_CONOCIDAS[normal(lineaCruda)] ?? titulo(lineaCruda);
  const version = versionTokens.map((tk) => (/^edicion$/i.test(tk) ? "Edición" : tk)).join(" ") || "Estándar";
  return { linea, version: version.slice(0, 40), transmision };
}

/* ---------- emparejar con el catálogo ---------- */

export interface VersionCatalogo {
  id: string;
  nombre: string;
  transmision: Transmision | null;
  nombreLista: string | null;
  visible: boolean;
  precio: number | null; // precio del día vigente
}

export interface ModeloCatalogo {
  id: string;
  linea: string;
  visible: boolean;
  archivado: boolean;
  versiones: VersionCatalogo[];
}

export type Destino =
  | { tipo: "existente"; versionId: string }
  | { tipo: "nueva"; modeloId: string | null; linea: string; nombre: string; transmision: Transmision | null }
  | { tipo: "omitir" };

export interface FilaPropuesta extends FilaLista {
  sugerido: Destino; // lo que propone el emparejamiento
  precioActual: number | null;
}

/** Busca cada fila en el catálogo: primero por el texto exacto guardado, luego por línea, nombre y transmisión. */
export function emparejar(filas: FilaLista[], modelos: ModeloCatalogo[]): FilaPropuesta[] {
  const versiones = modelos.flatMap((m) => m.versiones.map((v) => ({ ...v, modelo: m })));
  const usadas = new Set<string>();
  return filas.map((f) => {
    const porTexto = versiones.find((v) => v.nombreLista && normal(v.nombreLista) === normal(f.texto) && !usadas.has(v.id));
    const leido = interpretarTexto(f.texto);
    const candidatos = modelos.filter((m) => normal(m.linea) === normal(leido.linea));
    const modelo = candidatos.find((m) => !m.archivado) ?? candidatos[0];
    const porNombre =
      !porTexto && modelo
        ? modelo.versiones.find((v) => !usadas.has(v.id) && !v.nombreLista && normal(v.nombre) === normal(leido.version) && v.transmision === leido.transmision)
        : undefined;
    const elegida = porTexto ?? porNombre;
    if (elegida) {
      usadas.add(elegida.id);
      return { ...f, sugerido: { tipo: "existente", versionId: elegida.id }, precioActual: elegida.precio };
    }
    return {
      ...f,
      sugerido: { tipo: "nueva", modeloId: modelo?.id ?? null, linea: modelo?.linea ?? leido.linea, nombre: leido.version, transmision: leido.transmision },
      precioActual: null,
    };
  });
}

/** Tipo y puestos con los que nace un modelo creado desde la lista (Natalia los corrige en Catálogo). */
export function datosIniciales(linea: string, categoria: FilaLista["categoria"]) {
  const n = normal(linea);
  const tipo = n === "dzire" ? "sedan" : n === "jimny" ? "todoterreno" : n === "ertiga" || n === "xl7" ? "familiar" : categoria === "camioneta" ? "suv" : "hatchback";
  const puestos = n === "jimny" ? 4 : tipo === "familiar" ? 7 : 5;
  return { tipo, puestos } as const;
}
