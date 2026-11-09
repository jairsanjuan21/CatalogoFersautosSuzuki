import "server-only";
import { rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ALTO_PAGINA, type Celda, type Fecha, type Linea, type Marca } from "./coordenadas-fns01";

/**
 * Herramientas para escribir sobre un PDF existente.
 * pdf-lib mide desde ABAJO de la página; las coordenadas del mapa están medidas
 * desde ARRIBA, por eso cada función convierte con ALTO_PAGINA - y.
 */

const TINTA = rgb(0.06, 0.09, 0.2);
const TAMANO = 7.5;
const TAMANO_MINIMO = 5.2;

/** Deja solo caracteres que la fuente puede dibujar (WinAnsi: tildes y ñ sí; emojis no). */
export function limpiar(texto: string, fuente: PDFFont) {
  const normal = texto
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  let salida = "";
  for (const ch of normal) {
    try {
      fuente.encodeText(ch);
      salida += ch;
    } catch {
      const sinTilde = ch.normalize("NFD").replace(/\p{M}/gu, "");
      try {
        fuente.encodeText(sinTilde);
        salida += sinTilde;
      } catch {
        /* carácter imposible de dibujar (emoji, etc.): se omite */
      }
    }
  }
  return salida;
}

export class Estampador {
  constructor(
    private pagina: PDFPage,
    private fuente: PDFFont,
    private negrita: PDFFont,
  ) {}

  /** Texto dentro de una celda: se achica si no cabe y, como último recurso, se recorta con "…". */
  celda(caja: Celda, valor: string | number | null | undefined, opciones: { alinear?: "izquierda" | "centro" } = {}) {
    if (valor === null || valor === undefined || valor === "") return;
    const [x0, x1, arriba, abajo] = caja;
    const ancho = x1 - x0 - 6;
    let texto = limpiar(String(valor), this.fuente);
    let tam = TAMANO;
    while (tam > TAMANO_MINIMO && this.fuente.widthOfTextAtSize(texto, tam) > ancho) tam -= 0.25;
    if (this.fuente.widthOfTextAtSize(texto, tam) > ancho) {
      while (texto.length > 1 && this.fuente.widthOfTextAtSize(texto + "…", tam) > ancho) texto = texto.slice(0, -1);
      texto += "…";
    }
    const anchoTexto = this.fuente.widthOfTextAtSize(texto, tam);
    const alto = abajo - arriba;
    const x = opciones.alinear === "centro" ? x0 + (x1 - x0 - anchoTexto) / 2 : x0 + 3;
    const y = ALTO_PAGINA - abajo + (alto - tam * 0.72) / 2;
    this.pagina.drawText(texto, { x, y, size: tam, font: this.fuente, color: TINTA });
  }

  /** Texto sobre un subrayado (sin celda). */
  linea([x, yLinea]: Linea, valor: string | null | undefined, tam = TAMANO + 0.5) {
    if (!valor) return;
    this.pagina.drawText(limpiar(valor, this.fuente), { x, y: ALTO_PAGINA - yLinea + 2, size: tam, font: this.fuente, color: TINTA });
  }

  /** Una "X" centrada sobre una casilla ____ */
  marca(m: Marca | undefined) {
    if (!m) return;
    const [cx, abajo] = m;
    const tam = 8.5;
    const ancho = this.negrita.widthOfTextAtSize("X", tam);
    this.pagina.drawText("X", { x: cx - ancho / 2, y: ALTO_PAGINA - abajo + 1.5, size: tam, font: this.negrita, color: TINTA });
  }

  /**
   * Fecha en tres celdas DD / MM / AA. El formato trae esas letras en gris dentro
   * de cada celda, así que primero se tapan con un rectángulo blanco.
   */
  fecha(celdas: Fecha, iso: string | null | undefined) {
    if (!iso) return;
    const [anio, mes, dia] = iso.slice(0, 10).split("-");
    [dia, mes, anio].forEach((parte, i) => {
      const [x0, x1, arriba, abajo] = celdas[i];
      this.pagina.drawRectangle({
        x: x0 + 0.9,
        y: ALTO_PAGINA - abajo + 0.9,
        width: x1 - x0 - 1.8,
        height: abajo - arriba - 1.8,
        color: rgb(1, 1, 1),
      });
      this.celda(celdas[i], parte, { alinear: "centro" });
    });
  }

  textoLibre(x: number, yDesdeArriba: number, texto: string, tam: number, gris = false) {
    this.pagina.drawText(limpiar(texto, this.fuente), {
      x,
      y: ALTO_PAGINA - yDesdeArriba,
      size: tam,
      font: this.fuente,
      color: gris ? rgb(0.42, 0.45, 0.5) : TINTA,
    });
  }
}
