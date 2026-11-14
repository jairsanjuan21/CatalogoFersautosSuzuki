import "server-only";
import ExcelJS from "exceljs";
import { interpretarHojas, LIMITE_BYTES, type Celda, type Lista } from "./lista-excel";

export class ErrorExcel extends Error {}

/** Valor visible de una celda: números, textos, resultado de fórmulas y texto enriquecido. */
function valor(celda: ExcelJS.Cell, fila: ExcelJS.Row): Celda {
  const v = celda.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("formula" in v || "sharedFormula" in v) {
      const r = (v as ExcelJS.CellFormulaValue).result;
      if (typeof r === "number" || typeof r === "string") return r;
      // Sin resultado guardado: solo se resuelve la forma que usa Suzuki, "=D7-6000000"
      const f = String((v as ExcelJS.CellFormulaValue).formula ?? "").match(/^=?\s*([A-Z]+)(\d+)\s*-\s*(\d+)\s*$/i);
      if (f && Number(f[2]) === fila.number) {
        const base = fila.getCell(`${f[1]}${f[2]}`).value;
        if (typeof base === "number") return base - Number(f[3]);
      }
      return null;
    }
    if ("text" in v) return String(v.text);
  }
  return null;
}

/** Lee el .xlsx y devuelve la lista interpretada. Lanza ErrorExcel con un mensaje para Natalia. */
export async function leerExcel(datos: Buffer): Promise<Lista> {
  if (datos.length > LIMITE_BYTES) throw new ErrorExcel("El archivo pesa más de 2 MB. ¿Es la lista de precios?");
  // Un .xlsx es un ZIP: empieza por "PK"
  if (datos.subarray(0, 2).toString("latin1") !== "PK") throw new ErrorExcel("El archivo no es un Excel (.xlsx). Si es .xls, ábrelo y guárdalo como .xlsx.");
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(datos as unknown as ArrayBuffer);
  } catch {
    throw new ErrorExcel("No pudimos abrir el Excel. Puede estar dañado o protegido con contraseña.");
  }
  const hojas = libro.worksheets
    .filter((h) => h.state === "visible")
    .slice(0, 10)
    .map((h) => {
      const filas: Celda[][] = [];
      h.eachRow({ includeEmpty: true }, (fila, n) => {
        if (n > 500) return;
        const celdas: Celda[] = [];
        for (let c = 1; c <= Math.min(fila.cellCount, 30); c++) celdas.push(valor(fila.getCell(c), fila));
        filas[n - 1] = celdas;
      });
      return { nombre: h.name, filas: Array.from(filas, (f) => f ?? []) };
    });
  const lista = interpretarHojas(hojas);
  if (!lista.filas.length) throw new ErrorExcel("No encontramos precios en el Excel. Debe tener las columnas “Modelo”, “Precio Referencia” y “Precio Venta Público”.");
  return lista;
}
