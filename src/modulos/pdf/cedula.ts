import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { limpiar } from "./estampar";

/**
 * Las dos caras de la cédula en una hoja A4, como una fotocopia:
 * frente arriba, respaldo abajo, con los datos de la solicitud en el encabezado.
 */
export async function generarPdfCedula(datos: {
  nombre: string;
  documento: string;
  radicado: string;
  frente: Buffer;
  reves: Buffer;
}) {
  const pdf = await PDFDocument.create();
  const pagina = pdf.addPage([595.28, 841.89]);
  const [fuente, negrita] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const tinta = rgb(0.06, 0.09, 0.2);
  const gris = rgb(0.42, 0.45, 0.5);

  pagina.drawText("Documento de identidad", { x: 56, y: 790, size: 14, font: negrita, color: tinta });
  pagina.drawText(limpiar(`${datos.nombre}, ${datos.documento}`, fuente), { x: 56, y: 771, size: 10, font: fuente, color: tinta });
  pagina.drawText(`Radicado ${datos.radicado}`, { x: 56, y: 757, size: 9, font: fuente, color: gris });

  const [frente, reves] = await Promise.all([pdf.embedJpg(datos.frente), pdf.embedJpg(datos.reves)]);
  const caja = { ancho: 430, alto: 300 };
  const colocar = (img: typeof frente, techo: number, rotulo: string) => {
    const k = Math.min(caja.ancho / img.width, caja.alto / img.height);
    const w = img.width * k;
    const h = img.height * k;
    const x = (595.28 - w) / 2;
    pagina.drawText(rotulo, { x, y: techo + 6, size: 9, font: negrita, color: gris });
    pagina.drawImage(img, { x, y: techo - h, width: w, height: h });
    pagina.drawRectangle({ x, y: techo - h, width: w, height: h, borderColor: rgb(0.8, 0.83, 0.87), borderWidth: 0.6 });
  };
  colocar(frente, 725, "FRENTE");
  colocar(reves, 395, "RESPALDO");

  pdf.setTitle(`Cédula ${datos.radicado}`);
  pdf.setProducer("Sistema de solicitudes Fersautos");
  return pdf.save();
}
