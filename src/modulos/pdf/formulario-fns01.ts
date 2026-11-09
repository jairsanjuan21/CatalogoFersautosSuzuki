import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { OPCIONES } from "@/validacion/solicitud";
import type { SolicitudCompleta } from "@/modulos/solicitudes/consultar";
import { P1, P2, ALTO_PAGINA } from "./coordenadas-fns01";
import { Estampador } from "./estampar";

export interface DatosFijos {
  asesoraNombre: string;
  asesoraCc: string;
  ciudad: string;
  sede: string;
  marca: string;
  plan: string;
}

const pesos = (v: number | null | undefined) => (v || v === 0 ? "$ " + v.toLocaleString("es-CO") : null);
const cc = (n: string) => Number(n).toLocaleString("es-CO");
const fechaBogota = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);
const horaBogota = (d: Date) =>
  new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }).format(d);

let plantilla: Uint8Array | null = null;
async function cargarPlantilla() {
  plantilla ??= await readFile(path.join(process.cwd(), "plantillas", "F-NS-01.pdf"));
  return plantilla;
}

/** Diligencia el formato F-NS-01 con los datos de la solicitud y estampa la firma. */
export async function generarFormularioFns01(s: SolicitudCompleta, fijos: DatosFijos, firmaPng: Buffer | null) {
  if (s.valorVehiculo === null) throw new Error("La solicitud no tiene valor del vehículo");

  const pdf = await PDFDocument.load(await cargarPlantilla());
  const [fuente, negrita] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const [pag1, pag2] = pdf.getPages();
  const e1 = new Estampador(pag1, fuente, negrita);
  const e2 = new Estampador(pag2, fuente, negrita);

  /* ----- encabezado y asesora ----- */
  e1.linea(P1.ciudad, fijos.ciudad);
  e1.linea(P1.sede, fijos.sede);
  e1.fecha(P1.fechaDiligenciamiento, fechaBogota(s.creadoEn));
  e1.celda(P1.asesor, fijos.asesoraNombre);
  e1.celda(P1.asesorCc, cc(fijos.asesoraCc));
  e1.marca(P1.marcaSolicitante);
  e1.marca(P1.marcaCredito);

  /* ----- 1. vehículo ----- */
  e1.celda(P1.marca, fijos.marca);
  e1.celda(P1.linea, s.modelo?.linea ?? s.lineaInteres);
  e1.marca(P1.marcaNuevo);
  e1.marca(P1.marcaParticular);

  /* ----- 2. financiación ----- */
  e1.celda(P1.valorVehiculo, pesos(s.valorVehiculo));
  e1.celda(P1.cuotaInicial, pesos(s.cuotaInicial));
  e1.celda(P1.valorAFinanciar, pesos(s.valorAFinanciar));
  e1.celda(P1.plazo, `${s.plazoMeses} meses`);
  e1.celda(P1.planFinanciacion, fijos.plan);

  /* ----- 3. solicitante ----- */
  e1.celda(P1.primerApellido, s.primerApellido);
  e1.celda(P1.segundoApellido, s.segundoApellido);
  e1.celda(P1.nombres, s.nombres);
  e1.marca(s.tipoIdentificacion === "cc" ? P1.marcaCc : P1.marcaCe);
  e1.celda(P1.numeroIdentificacion, cc(s.numeroIdentificacion));
  e1.celda(P1.lugarExpedicion, s.lugarExpedicion);
  e1.fecha(P1.fechaExpedicion, s.fechaExpedicion);
  e1.fecha(P1.fechaNacimiento, s.fechaNacimiento);
  e1.celda(P1.lugarNacimiento, s.lugarNacimiento);
  e1.marca(s.genero === "f" ? P1.marcaF : P1.marcaM);
  e1.celda(P1.estadoCivil, OPCIONES.estadoCivil[s.estadoCivil]);
  e1.celda(P1.personasACargo, s.personasACargo, { alinear: "centro" });
  e1.celda(P1.profesion, s.profesion);
  e1.celda(P1.direccion, s.direccion);
  e1.celda(P1.estrato, s.estrato, { alinear: "centro" });
  e1.celda(P1.barrio, s.barrio);
  e1.celda(P1.ciudadResidencia, s.ciudad);
  e1.celda(P1.telefonoFijo, s.telefonoFijo);
  e1.celda(P1.celular, s.celular);
  e1.celda(P1.correo, s.correo);
  e1.marca(P1.marcaVivienda[s.tipoVivienda]);
  e1.celda(P1.tiempoVivienda, s.tiempoVivienda);
  if (s.tipoVivienda === "arrendada") {
    e1.celda(P1.arrendadorNombre, s.arrendadorNombre);
    e1.celda(P1.arrendadorTelefono, s.arrendadorTelefono);
    e1.celda(P1.valorArriendo, pesos(s.valorArriendo));
  }

  /* ----- 4. actividad económica ----- */
  e1.marca(P1.marcaActividad[s.actividad]);
  e1.celda(P1.empresa, s.empresa);
  e1.celda(P1.direccionEmpresa, s.direccionEmpresa);
  e1.celda(P1.telefonoEmpresa, s.telefonoEmpresa);
  e1.celda(P1.cargo, s.cargo);
  e1.celda(P1.antiguedad, s.antiguedad);
  if (s.tipoContrato) e1.marca(P1.marcaContrato[s.tipoContrato]);
  e1.celda(P1.anteriorEmpresa, s.anteriorEmpresa);
  e1.celda(P1.anteriorCargo, s.anteriorCargo);
  e1.celda(P1.anteriorAntiguedad, s.anteriorAntiguedad);
  e1.celda(P1.anteriorTelefono, s.anteriorTelefono);
  if (s.anteriorTipoContrato) e1.marca(P1.marcaContratoAnterior[s.anteriorTipoContrato]);

  /* ----- 5. información financiera ----- */
  // El formato ya trae impreso el "$" en estas líneas
  e1.linea(P1.totalIngresos, s.ingresosMensuales.toLocaleString("es-CO"));
  e1.linea(P1.totalEgresos, s.egresosMensuales.toLocaleString("es-CO"));
  e1.marca(P1.marcaRenta[s.declaraRenta ? "si" : "no"]);
  e1.marca(P1.marcaMonedaExtranjera[s.monedaExtranjera ? "si" : "no"]);

  /* ----- 6. patrimonio (el formato tiene espacio para uno de cada uno en la primera fila) ----- */
  const inm = s.inmuebles[0];
  if (inm) {
    e1.celda(P1.inmueble.numero, "1", { alinear: "centro" });
    e1.celda(P1.inmueble.direccion, inm.direccion);
    e1.celda(P1.inmueble.ciudad, inm.ciudad);
    e1.marca(P1.inmueble.marcaClase[inm.clase]);
    e1.celda(P1.inmueble.matricula, inm.matricula);
    e1.celda(P1.inmueble.valor, pesos(inm.valor));
    e1.celda(P1.inmueble.hipoteca, pesos(inm.saldoHipoteca));
  }
  const veh = s.vehiculos[0];
  if (veh) {
    e1.celda(P1.vehiculo.marca, veh.marca);
    e1.celda(P1.vehiculo.placa, veh.placa);
    e1.celda(P1.vehiculo.modelo, veh.modeloAnio);
    e1.celda(P1.vehiculo.valor, pesos(veh.valor));
    e1.celda(P1.vehiculo.pignoradoA, veh.pignoradoA);
    e1.celda(P1.vehiculo.saldo, pesos(veh.saldoObligacion));
  }

  /* ----- 7. referencias ----- */
  const ref = (tipo: string) => s.referencias.find((r) => r.tipo === tipo);
  e2.celda(P2.refFamiliarNombre, ref("familiar")?.nombre);
  e2.celda(P2.refFamiliarParentesco, ref("familiar")?.parentesco);
  e2.celda(P2.refFamiliarCelular, ref("familiar")?.celular);
  e2.celda(P2.refPersonalNombre, ref("personal")?.nombre);
  e2.celda(P2.refPersonalCelular, ref("personal")?.celular);
  e2.celda(P2.refComercialNombre, ref("comercial")?.nombre);
  e2.celda(P2.refComercialCelular, ref("comercial")?.celular);

  /* ----- 8. cónyuge ----- */
  const c = s.conyuge;
  if (c) {
    e2.celda(P2.conyuge.primerApellido, c.primerApellido);
    e2.celda(P2.conyuge.segundoApellido, c.segundoApellido);
    e2.celda(P2.conyuge.nombres, c.nombres);
    e2.marca(c.tipoIdentificacion === "cc" ? P2.conyuge.marcaCc : P2.conyuge.marcaCe);
    e2.celda(P2.conyuge.numeroIdentificacion, cc(c.numeroIdentificacion));
    e2.fecha(P2.conyuge.fechaNacimiento, c.fechaNacimiento);
    e2.celda(P2.conyuge.profesion, c.profesion);
    if (c.actividad) e2.marca(P2.conyuge.marcaActividad[c.actividad]);
    e2.celda(P2.conyuge.empresa, c.empresa);
    e2.celda(P2.conyuge.celular, c.celular);
    e2.celda(P2.conyuge.ingresoMensual, pesos(c.ingresoMensual));
  }

  /* ----- 9. firma ----- */
  if (firmaPng) {
    const imagen = await pdf.embedPng(firmaPng);
    const { x0, x1, arriba, abajo } = P2.firma;
    const escala = Math.min((x1 - x0) / imagen.width, (abajo - arriba) / imagen.height);
    const ancho = imagen.width * escala;
    pag2.drawImage(imagen, {
      x: x0 + (x1 - x0 - ancho) / 2,
      y: ALTO_PAGINA - abajo,
      width: ancho,
      height: imagen.height * escala,
    });
  }
  e2.linea(P2.firmaCc, cc(s.numeroIdentificacion), 8);

  // Constancia de la firma electrónica: cuándo, desde dónde y qué solicitud
  e2.textoLibre(
    P2.constancia[0],
    P2.constancia[1],
    `Firmado en el formulario web el ${horaBogota(s.aceptaAutorizacionEn)} (hora de Colombia)` +
      `${s.ipFirma ? `, IP ${s.ipFirma}` : ""}. Radicado ${s.radicado}.`,
    6,
    true,
  );

  pdf.setTitle(`Solicitud de crédito ${s.radicado}`);
  pdf.setSubject("Formato único de solicitud de crédito persona natural F-NS-01");
  pdf.setAuthor(fijos.asesoraNombre);
  pdf.setProducer("Sistema de solicitudes Fersautos");
  return pdf.save();
}
