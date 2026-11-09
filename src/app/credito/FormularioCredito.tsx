"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { z } from "zod";
import {
  OPCIONES,
  PLAZOS,
  erroresPorCampo,
  esquemaSolicitud,
  pasoActividad,
  pasoConyuge,
  pasoContacto,
  pasoFinanzas,
  pasoPersonal,
  pasoReferencias,
  pasoVehiculo,
} from "@/validacion/solicitud";
import { escribir, leer, plata } from "@/lib/formato";
import {
  Chips,
  Digitos,
  Dinero,
  FormularioContexto,
  Interruptor,
  Nota,
  Numero,
  Seleccion,
  Subtitulo,
  Texto,
  useCampo,
} from "./campos";
import { Carretera } from "./Carretera";
import { Firma } from "./Firma";
import { FotoCedula, type Foto } from "./FotoCedula";

/* ============================================================================
   TIPOS Y CONFIGURACIÓN
   ========================================================================== */

export interface ConfigFormulario {
  asesoraNombre: string;
  asesoraWhatsapp: string | null;
  sede: string;
  ciudad: string;
  plazos: number[];
  clausula: { version: number; texto: string };
  lineas: string[];
}

type Borrador = Record<string, Record<string, unknown> | undefined>;
type Errores = Record<string, string>;

interface Estado {
  datos: Borrador;
  fotos: { frente?: Foto; reves?: Foto };
  firma: Blob | null;
  acepta: { autorizacion: boolean; datos: boolean };
}

const CLAVE_BORRADOR = "fersautos-borrador-v1";

/** Valida un paso con su esquema y devuelve los errores con el prefijo del paso */
function validarCon(esquema: z.ZodType, prefijo: string, valor: unknown): Errores {
  const r = esquema.safeParse(valor ?? {});
  if (r.success) return {};
  return Object.fromEntries(Object.entries(erroresPorCampo(r.error)).map(([k, v]) => [`${prefijo}.${k}`, v]));
}

interface Paso {
  clave: string;
  corto: string;
  titulo: string;
  intro: string;
  validar: (e: Estado) => Errores;
}

const PASOS: Paso[] = [
  {
    clave: "vehiculo",
    corto: "Vehículo",
    titulo: "Tu Suzuki y la financiación",
    intro: "Cuéntanos con cuánto cuentas para la cuota inicial y en cuánto tiempo quieres pagar.",
    validar: (e) => validarCon(pasoVehiculo, "vehiculo", e.datos.vehiculo),
  },
  {
    clave: "personal",
    corto: "Datos personales",
    titulo: "Tus datos personales",
    intro: "Escríbelos tal como aparecen en tu documento de identidad.",
    validar: (e) => validarCon(pasoPersonal, "personal", e.datos.personal),
  },
  {
    clave: "documento",
    corto: "Cédula",
    titulo: "Foto de tu cédula",
    intro: "Toma una foto de cada cara de tu documento. La entidad financiera la necesita para estudiar tu crédito.",
    validar: (e) => ({
      ...(!e.fotos.frente && { "documento.cedulaFrente": "Falta la foto del frente de tu cédula." }),
      ...(!e.fotos.reves && { "documento.cedulaReves": "Falta la foto del respaldo de tu cédula." }),
    }),
  },
  {
    clave: "contacto",
    corto: "Contacto y vivienda",
    titulo: "Contacto y vivienda",
    intro: "Natalia te contactará por estos medios.",
    validar: (e) => validarCon(pasoContacto, "contacto", e.datos.contacto),
  },
  {
    clave: "actividad",
    corto: "Actividad económica",
    titulo: "Tu actividad económica",
    intro: "Así sabremos de dónde vienen tus ingresos.",
    validar: (e) => validarCon(pasoActividad, "actividad", e.datos.actividad),
  },
  {
    clave: "finanzas",
    corto: "Finanzas",
    titulo: "Tus ingresos y gastos",
    intro: "Valores mensuales aproximados. Suma todo lo que recibes y todo lo que pagas.",
    validar: (e) => validarCon(pasoFinanzas, "finanzas", e.datos.finanzas),
  },
  {
    clave: "referencias",
    corto: "Referencias",
    titulo: "Tus referencias",
    intro: "Personas que te conozcan y que la entidad financiera pueda llamar. No pueden vivir contigo.",
    validar: (e) => validarCon(pasoReferencias, "referencias", e.datos.referencias),
  },
  {
    clave: "conyuge",
    corto: "Cónyuge",
    titulo: "Datos de tu cónyuge",
    intro: "Solo si tienes esposo(a) o compañero(a) permanente.",
    validar: (e) => validarCon(pasoConyuge, "conyuge", e.datos.conyuge),
  },
  {
    clave: "firma",
    corto: "Revisar y firmar",
    titulo: "Revisa y firma",
    intro: "Confirma que todo esté bien. Puedes volver a cualquier sección para corregir.",
    validar: (e) => ({
      ...(!e.acepta.autorizacion && { "consentimiento.aceptaAutorizacion": "Debes aceptar la autorización para enviar la solicitud." }),
      ...(!e.acepta.datos && { "consentimiento.aceptaDatos": "Debes autorizar el tratamiento de tus datos." }),
      ...(!e.firma && { firma: "Falta tu firma en el recuadro." }),
    }),
  },
];

/** A qué paso pertenece un error ("contacto.celular" → paso de contacto) */
const pasoDelError = (clave: string) => {
  const raiz = clave.split(".")[0];
  if (raiz === "consentimiento") return PASOS.length - 1;
  const i = PASOS.findIndex((p) => p.clave === raiz);
  return i === -1 ? PASOS.length - 1 : i;
};

/**
 * "Dayerly Natalia Garcia Sierra" → { visible: "Natalia Garcia", primero: "Natalia" }.
 * Con cuatro palabras (dos nombres y dos apellidos) se usa el segundo nombre,
 * que es como ella se presenta a sus clientes.
 */
function nombreDeAsesora(completo: string) {
  const p = completo.trim().split(/\s+/);
  const visible = p.length >= 4 ? `${p[1]} ${p[2]}` : p.length === 3 ? `${p[0]} ${p[1]}` : completo;
  return { visible, primero: visible.split(" ")[0] };
}

const opciones = <T extends Record<string, string>>(o: T) => Object.entries(o) as [keyof T & string, string][];
const SI_NO: [boolean, string][] = [
  [true, "Sí"],
  [false, "No"],
];

/* ============================================================================
   COMPONENTE PRINCIPAL
   ========================================================================== */

export function FormularioCredito({ config }: { config: ConfigFormulario }) {
  const params = useSearchParams();
  const [paso, setPaso] = useState(-1); // -1 bienvenida, PASOS.length = enviada
  const [estado, setEstado] = useState<Estado>({
    datos: {},
    fotos: {},
    firma: null,
    acepta: { autorizacion: false, datos: false },
  });
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [radicado, setRadicado] = useState<string>();
  const trampa = useRef<HTMLInputElement>(null);

  // ¿Hay un borrador guardado? Se lee de localStorage sin romper el render del servidor.
  const hayBorrador = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(CLAVE_BORRADOR) !== null;
      } catch {
        return false;
      }
    },
    () => false,
  );

  // El borrador se guarda en cada cambio. Las fotos, la firma y las autorizaciones
  // NO se guardan en el navegador, por privacidad.
  useEffect(() => {
    if (paso < 0 || paso >= PASOS.length) return;
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ datos: estado.datos }));
    } catch {
      /* almacenamiento lleno o bloqueado: el formulario sigue funcionando */
    }
  }, [estado.datos, paso]);

  function empezar(desdeCero: boolean) {
    let datos: Borrador = {};
    try {
      if (desdeCero) localStorage.removeItem(CLAVE_BORRADOR);
      else datos = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) ?? "null")?.datos ?? {};
    } catch {
      /* borrador dañado: se empieza de cero */
    }
    // El catálogo puede enviar ?linea=Swift para preseleccionar el modelo
    const linea = params.get("linea");
    if (linea && config.lineas.includes(linea) && !datos.vehiculo?.lineaInteres) {
      datos = escribir(datos, "vehiculo.lineaInteres", linea);
    }
    if (!datos.contacto?.ciudad) datos = escribir(datos, "contacto.ciudad", config.ciudad);
    setEstado((e) => ({ ...e, datos }));
    irA(0);
  }

  function irA(i: number) {
    setPaso(i);
    setMensaje(undefined);
    window.scrollTo({ top: 0 });
  }

  function mostrarErrores(e: Errores) {
    setErrores(e);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-con-error="true"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    });
  }

  const ctx = {
    valor: (ruta: string) => leer(estado.datos, ruta),
    cambiar: (ruta: string, valor: unknown) => {
      setEstado((e) => ({ ...e, datos: escribir(e.datos, ruta, valor) }));
      setErrores((er) => {
        if (!Object.keys(er).some((k) => k === ruta || k.startsWith(ruta + "."))) return er;
        return Object.fromEntries(Object.entries(er).filter(([k]) => k !== ruta && !k.startsWith(ruta + ".")));
      });
    },
    error: (ruta: string) => errores[ruta],
  };

  async function continuar() {
    const e = PASOS[paso].validar(estado);
    if (Object.keys(e).length) return mostrarErrores(e);
    setErrores({});
    if (paso < PASOS.length - 1) return irA(paso + 1);
    await enviar();
  }

  async function enviar() {
    const { datos } = estado;
    const solicitud = {
      vehiculo: datos.vehiculo,
      personal: datos.personal,
      contacto: datos.contacto,
      actividad: datos.actividad,
      finanzas: datos.finanzas,
      referencias: datos.referencias,
      conyuge: datos.conyuge ?? {},
      consentimiento: {
        clausulaVersion: config.clausula.version,
        aceptaAutorizacion: estado.acepta.autorizacion,
        aceptaDatos: estado.acepta.datos,
      },
    };

    // Revisión completa antes de enviar (incluye reglas que cruzan pasos)
    const r = esquemaSolicitud.safeParse(solicitud);
    if (!r.success) {
      const e = erroresPorCampo(r.error);
      const primero = Math.min(...Object.keys(e).map(pasoDelError));
      irA(primero);
      return mostrarErrores(e);
    }

    const cuerpo = new FormData();
    cuerpo.set("datos", JSON.stringify(solicitud));
    cuerpo.set("origen", params.get("origen") ?? "directo");
    cuerpo.set("sitio_web", trampa.current?.value ?? "");
    cuerpo.set("cedulaFrente", estado.fotos.frente!.blob, "cedula-frente.jpg");
    cuerpo.set("cedulaReves", estado.fotos.reves!.blob, "cedula-reves.jpg");
    cuerpo.set("firma", estado.firma!, "firma.png");

    setEnviando(true);
    setMensaje(undefined);
    try {
      const res = await fetch("/api/solicitudes", { method: "POST", body: cuerpo });
      const json = await res.json().catch(() => ({}));
      if (res.status === 201) {
        try {
          localStorage.removeItem(CLAVE_BORRADOR);
        } catch {}
        setRadicado(json.radicado);
        irA(PASOS.length);
        return;
      }
      if (res.status === 422 && json.errores) {
        const primero = Math.min(...Object.keys(json.errores as Errores).map(pasoDelError));
        if (primero !== paso) irA(primero);
        mostrarErrores(json.errores);
      }
      if (json.codigo === "FIRMA_INVALIDA") mostrarErrores({ firma: json.mensaje });
      else if (json.codigo === "IMAGEN_INVALIDA") {
        irA(2);
        mostrarErrores({ "documento.cedulaFrente": json.mensaje });
      }
      setMensaje(json.mensaje ?? "No pudimos enviar tu solicitud. Intenta de nuevo.");
    } catch {
      setMensaje("No hay conexión. Revisa tu internet e intenta de nuevo; tus datos siguen aquí.");
    } finally {
      setEnviando(false);
    }
  }

  /* ---------- pantallas ---------- */

  const cabecera = <Asesora nombre={config.asesoraNombre} sede={config.sede} />;

  if (paso === -1) {
    return (
      <>
        {cabecera}
        <Bienvenida hayBorrador={hayBorrador} alEmpezar={() => empezar(false)} alReiniciar={() => empezar(true)} />
      </>
    );
  }

  if (paso === PASOS.length) {
    return (
      <>
        {cabecera}
        <Confirmacion
          radicado={radicado!}
          nombre={String(estado.datos.personal?.nombres ?? "").split(" ")[0]}
          celular={String(estado.datos.contacto?.celular ?? "")}
          whatsapp={config.asesoraWhatsapp}
          asesora={nombreDeAsesora(config.asesoraNombre).primero}
        />
      </>
    );
  }

  const P = PASOS[paso];
  return (
    <FormularioContexto value={ctx}>
      {cabecera}
      <Carretera paso={paso} total={PASOS.length} nombre={P.corto} />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          continuar();
        }}
        className="pb-28"
      >
        <h2 className="font-display mt-6 text-[28px] leading-tight font-semibold">{P.titulo}</h2>
        <p className="mt-1.5 mb-5 max-w-[60ch] text-texto-2">{P.intro}</p>

        {/* Campo trampa para bots: invisible y fuera del orden de tabulación */}
        <input
          ref={trampa}
          name="sitio_web"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] h-px w-px opacity-0"
        />

        <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
          <ContenidoPaso
            clave={P.clave}
            config={config}
            estado={estado}
            setEstado={setEstado}
            errores={errores}
            irA={irA}
          />
        </div>

        {mensaje && (
          <p role="alert" className="mt-5 rounded-lg bg-senal-fondo p-3.5 text-senal">
            {mensaje}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-linea bg-fondo pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-2xl gap-2.5 px-5">
            <button
              type="button"
              onClick={() => irA(paso - 1)}
              className="min-h-[50px] rounded-xl border border-linea-2 bg-superficie px-5 font-semibold"
            >
              Atrás
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="min-h-[50px] flex-1 rounded-xl bg-azul font-semibold text-white hover:bg-azul-hover disabled:cursor-wait disabled:opacity-60"
            >
              {enviando ? "Enviando…" : paso === PASOS.length - 1 ? "Enviar solicitud" : "Continuar"}
            </button>
          </div>
        </div>
      </form>
    </FormularioContexto>
  );
}

/* ============================================================================
   CONTENIDO DE CADA PASO
   ========================================================================== */

interface PropsPaso {
  clave: string;
  config: ConfigFormulario;
  estado: Estado;
  setEstado: React.Dispatch<React.SetStateAction<Estado>>;
  errores: Errores;
  irA: (i: number) => void;
}

function ContenidoPaso(p: PropsPaso) {
  switch (p.clave) {
    case "vehiculo":
      return <PasoVehiculo config={p.config} />;
    case "personal":
      return <PasoPersonal />;
    case "documento":
      return <PasoDocumento {...p} />;
    case "contacto":
      return <PasoContacto />;
    case "actividad":
      return <PasoActividad />;
    case "finanzas":
      return <PasoFinanzas />;
    case "referencias":
      return <PasoReferencias />;
    case "conyuge":
      return <PasoConyuge />;
    default:
      return <PasoFirma {...p} />;
  }
}

function DatosFijos({ items }: { items: [string, string, boolean?][] }) {
  return (
    <dl className="col-span-2 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-px overflow-hidden rounded-xl border border-linea bg-linea">
      {items.map(([k, v, pendiente]) => (
        <div key={k} className="bg-superficie px-3 py-2.5">
          <dt className="text-[13px] text-texto-2">{k}</dt>
          <dd className={`font-semibold ${pendiente ? "text-azul-texto" : ""}`}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function PasoVehiculo({ config }: { config: ConfigFormulario }) {
  return (
    <>
      <DatosFijos
        items={[
          ["Sede", config.sede],
          ["Marca", "Suzuki"],
          ["Condición", "Nuevo"],
          ["Servicio", "Particular"],
          ["Plan", "Tradicional"],
          ["Valor del vehículo", "Lo confirma Natalia", true],
        ]}
      />
      <Seleccion
        ruta="vehiculo.lineaInteres"
        etiqueta="Línea que te interesa"
        opcional
        opciones={config.lineas}
        ayuda="Natalia te confirma la versión y el modelo exactos."
      />
      <Dinero ruta="vehiculo.cuotaInicial" etiqueta="Cuota inicial" ayuda="El dinero que tienes disponible para el primer pago." />
      <Chips
        ruta="vehiculo.plazoMeses"
        etiqueta="Plazo"
        sufijo=" meses"
        opciones={PLAZOS.filter((x) => config.plazos.includes(x)).map((x) => [x, String(x)])}
      />
    </>
  );
}

function PasoPersonal() {
  return (
    <>
      <Texto ruta="personal.primerApellido" etiqueta="Primer apellido" media autoComplete="family-name" />
      <Texto ruta="personal.segundoApellido" etiqueta="Segundo apellido" opcional media />
      <Texto ruta="personal.nombres" etiqueta="Nombres" autoComplete="given-name" />
      <Chips ruta="personal.tipoIdentificacion" etiqueta="Tipo de documento" opciones={opciones(OPCIONES.tipoIdentificacion)} />
      <Digitos ruta="personal.numeroIdentificacion" etiqueta="Número de documento" max={11} media />
      <Texto ruta="personal.fechaExpedicion" etiqueta="Fecha de expedición" tipo="date" media />
      <Texto ruta="personal.lugarExpedicion" etiqueta="Lugar de expedición" media placeholder="Ej: Cúcuta" />
      <Texto ruta="personal.fechaNacimiento" etiqueta="Fecha de nacimiento" tipo="date" media autoComplete="bday" />
      <Texto ruta="personal.lugarNacimiento" etiqueta="Lugar de nacimiento" media />
      <Chips ruta="personal.genero" etiqueta="Género" opciones={opciones(OPCIONES.genero)} media />
      <Seleccion ruta="personal.estadoCivil" etiqueta="Estado civil" opciones={OPCIONES.estadoCivil} media />
      <Numero ruta="personal.personasACargo" etiqueta="Personas a cargo" max={20} media />
      <Texto ruta="personal.profesion" etiqueta="Profesión u ocupación" placeholder="Ej: Contador, comerciante, conductor" />
    </>
  );
}

function PasoDocumento({ estado, setEstado, errores }: PropsPaso) {
  const cambiarFoto = (lado: "frente" | "reves") => (f: Foto) =>
    setEstado((e) => ({ ...e, fotos: { ...e.fotos, [lado]: f } }));
  return (
    <>
      <ul className="col-span-2 flex flex-wrap gap-2" aria-label="Consejos para la foto">
        {["Buena luz, sin flash ni reflejos", "El documento completo dentro del marco", "Sobre una superficie lisa y oscura"].map(
          (c) => (
            <li key={c} className="rounded-md bg-cielo px-2.5 py-1.5 text-sm">
              {c}
            </li>
          ),
        )}
      </ul>
      <div className="col-span-2" data-con-error={!!errores["documento.cedulaFrente"]} tabIndex={-1}>
        <FotoCedula
          titulo="Frente"
          descripcion="La cara con tu foto y tu número de documento"
          foto={estado.fotos.frente}
          alCambiar={cambiarFoto("frente")}
          error={estado.fotos.frente ? undefined : errores["documento.cedulaFrente"]}
        />
      </div>
      <div className="col-span-2" data-con-error={!!errores["documento.cedulaReves"]} tabIndex={-1}>
        <FotoCedula
          titulo="Respaldo"
          descripcion="La cara con la huella y el código de barras"
          foto={estado.fotos.reves}
          alCambiar={cambiarFoto("reves")}
          error={estado.fotos.reves ? undefined : errores["documento.cedulaReves"]}
        />
      </div>
      <Nota>Por seguridad, las fotos no se guardan en tu celular: si sales del formulario, tendrás que tomarlas de nuevo.</Nota>
    </>
  );
}

function PasoContacto() {
  const { valor: vivienda } = useCampo("contacto.tipoVivienda");
  return (
    <>
      <Digitos ruta="contacto.celular" etiqueta="Celular" max={10} media autoComplete="tel-national" placeholder="3001234567" />
      <Digitos ruta="contacto.telefonoFijo" etiqueta="Teléfono fijo" opcional max={10} media />
      <Texto ruta="contacto.correo" etiqueta="Correo electrónico" tipo="email" autoComplete="email" />
      <Texto ruta="contacto.direccion" etiqueta="Dirección de residencia" placeholder="Ej: Av. 0 # 12-34" autoComplete="street-address" />
      <Texto ruta="contacto.barrio" etiqueta="Barrio" media />
      <Texto ruta="contacto.ciudad" etiqueta="Ciudad" media />
      <Chips ruta="contacto.estrato" etiqueta="Estrato" opciones={[1, 2, 3, 4, 5, 6].map((n) => [n, String(n)])} />
      <Chips ruta="contacto.tipoVivienda" etiqueta="Tipo de vivienda" opciones={opciones(OPCIONES.tipoVivienda)} />
      <Texto ruta="contacto.tiempoVivienda" etiqueta="Tiempo en la vivienda" media placeholder="Ej: 3 años" />
      {vivienda === "arrendada" && (
        <>
          <Subtitulo>Datos del arriendo</Subtitulo>
          <Texto ruta="contacto.arrendadorNombre" etiqueta="Nombre del arrendador" />
          <Digitos ruta="contacto.arrendadorTelefono" etiqueta="Teléfono del arrendador" max={10} media />
          <Dinero ruta="contacto.valorArriendo" etiqueta="Valor del arriendo" media />
        </>
      )}
    </>
  );
}

function PasoActividad() {
  const { valor: actividad } = useCampo("actividad.actividad");
  const anterior = useCampo("actividad.tieneEmpleoAnterior");
  const empleado = actividad === "empleado";
  const independiente = actividad === "independiente";
  const etiquetaEmpresa: Record<string, string> = {
    empleado: "Empresa donde trabajas",
    independiente: "Tu negocio y a qué se dedica",
    pensionado: "Entidad que te paga la pensión",
    rentista: "Origen de tus rentas",
  };
  return (
    <>
      <Chips ruta="actividad.actividad" etiqueta="¿Cuál es tu actividad?" opciones={opciones(OPCIONES.actividad)} />
      {typeof actividad === "string" && (
        <Texto ruta="actividad.empresa" etiqueta={etiquetaEmpresa[actividad]} />
      )}
      {(empleado || independiente) && (
        <>
          <Texto ruta="actividad.direccionEmpresa" etiqueta={independiente ? "Dirección del negocio" : "Dirección de la empresa"} />
          <Digitos ruta="actividad.telefonoEmpresa" etiqueta="Teléfono" opcional max={10} media />
          <Texto ruta="actividad.antiguedad" etiqueta={independiente ? "Tiempo con el negocio" : "Antigüedad"} media placeholder="Ej: 2 años" />
        </>
      )}
      {empleado && (
        <>
          <Texto ruta="actividad.cargo" etiqueta="Cargo" media />
          <Chips ruta="actividad.tipoContrato" etiqueta="Tipo de contrato" opciones={opciones(OPCIONES.tipoContrato)} />
          <Interruptor activo={anterior.valor === true} alCambiar={(v) => anterior.cambiar(v)}>
            Llevo poco tiempo aquí y quiero agregar mi empleo anterior
          </Interruptor>
          {anterior.valor === true && (
            <>
              <Texto ruta="actividad.anteriorEmpresa" etiqueta="Empresa anterior" />
              <Texto ruta="actividad.anteriorCargo" etiqueta="Cargo" opcional media />
              <Texto ruta="actividad.anteriorAntiguedad" etiqueta="Antigüedad" opcional media />
              <Digitos ruta="actividad.anteriorTelefono" etiqueta="Teléfono de la empresa" opcional max={10} media />
              <Chips ruta="actividad.anteriorTipoContrato" etiqueta="Tipo de contrato" opcional opciones={opciones(OPCIONES.tipoContrato)} />
            </>
          )}
        </>
      )}
    </>
  );
}

function PasoFinanzas() {
  const inmueble = useCampo("finanzas.inmueble");
  const vehiculo = useCampo("finanzas.vehiculo");
  return (
    <>
      <Dinero ruta="finanzas.ingresosMensuales" etiqueta="Total de ingresos mensuales" media />
      <Dinero ruta="finanzas.egresosMensuales" etiqueta="Total de gastos mensuales" media ayuda="Familia, préstamos, arriendo, hipoteca y otros." />
      <Chips ruta="finanzas.declaraRenta" etiqueta="¿Declaras renta?" opciones={SI_NO} media />
      <Chips ruta="finanzas.monedaExtranjera" etiqueta="¿Haces operaciones en moneda extranjera?" opciones={SI_NO} media />
      <Subtitulo nota="Si tienes bienes a tu nombre, registrarlos puede fortalecer tu solicitud.">Patrimonio</Subtitulo>
      <Interruptor activo={!!inmueble.valor} alCambiar={(v) => inmueble.cambiar(v ? {} : undefined)}>
        Tengo un inmueble (casa, apartamento, local o finca)
      </Interruptor>
      {!!inmueble.valor && (
        <>
          <Chips ruta="finanzas.inmueble.clase" etiqueta="Tipo de inmueble" opciones={opciones(OPCIONES.claseInmueble)} />
          <Texto ruta="finanzas.inmueble.direccion" etiqueta="Dirección del inmueble" />
          <Texto ruta="finanzas.inmueble.ciudad" etiqueta="Ciudad" media />
          <Texto ruta="finanzas.inmueble.matricula" etiqueta="Matrícula inmobiliaria" opcional media />
          <Dinero ruta="finanzas.inmueble.valor" etiqueta="Valor del inmueble" media />
          <Dinero ruta="finanzas.inmueble.saldoHipoteca" etiqueta="Saldo de hipoteca" opcional media />
        </>
      )}
      <Interruptor activo={!!vehiculo.valor} alCambiar={(v) => vehiculo.cambiar(v ? {} : undefined)}>
        Tengo un vehículo
      </Interruptor>
      {!!vehiculo.valor && (
        <>
          <Texto ruta="finanzas.vehiculo.marca" etiqueta="Marca" media />
          <Texto ruta="finanzas.vehiculo.placa" etiqueta="Placa" media placeholder="ABC123" maxLength={6} />
          <Numero ruta="finanzas.vehiculo.modeloAnio" etiqueta="Modelo (año)" opcional max={2100} media />
          <Dinero ruta="finanzas.vehiculo.valor" etiqueta="Valor" opcional media />
          <Texto ruta="finanzas.vehiculo.pignoradoA" etiqueta="Pignorado a" opcional media placeholder="Entidad, si aplica" />
          <Dinero ruta="finanzas.vehiculo.saldoObligacion" etiqueta="Saldo de la deuda" opcional media />
        </>
      )}
    </>
  );
}

function PasoReferencias() {
  return (
    <>
      <Subtitulo>Referencia familiar</Subtitulo>
      <Texto ruta="referencias.familiar.nombre" etiqueta="Nombre completo" />
      <Texto ruta="referencias.familiar.parentesco" etiqueta="Parentesco" media placeholder="Ej: Hermana" />
      <Digitos ruta="referencias.familiar.celular" etiqueta="Celular" max={10} media />
      <Subtitulo>Referencia personal</Subtitulo>
      <Texto ruta="referencias.personal.nombre" etiqueta="Nombre completo" />
      <Digitos ruta="referencias.personal.celular" etiqueta="Celular" max={10} media />
      <Subtitulo>Referencia comercial</Subtitulo>
      <Texto ruta="referencias.comercial.nombre" etiqueta="Nombre o empresa" placeholder="Ej: Almacén donde tienes crédito" />
      <Digitos ruta="referencias.comercial.celular" etiqueta="Celular" max={10} media />
    </>
  );
}

function PasoConyuge() {
  const conyuge = useCampo("conyuge.conyuge");
  const { valor: estadoCivil } = useCampo("personal.estadoCivil");
  const { valor: actividad } = useCampo("conyuge.conyuge.actividad");
  return (
    <>
      {(estadoCivil === "casado" || estadoCivil === "union_libre") && (
        <Nota>Según tu estado civil, la entidad financiera probablemente te pedirá estos datos.</Nota>
      )}
      <Interruptor activo={!!conyuge.valor} alCambiar={(v) => conyuge.cambiar(v ? {} : undefined)}>
        Quiero agregar los datos de mi cónyuge
      </Interruptor>
      {!!conyuge.valor && (
        <>
          <Texto ruta="conyuge.conyuge.primerApellido" etiqueta="Primer apellido" media />
          <Texto ruta="conyuge.conyuge.segundoApellido" etiqueta="Segundo apellido" opcional media />
          <Texto ruta="conyuge.conyuge.nombres" etiqueta="Nombres" />
          <Chips ruta="conyuge.conyuge.tipoIdentificacion" etiqueta="Tipo de documento" opciones={opciones(OPCIONES.tipoIdentificacion)} />
          <Digitos ruta="conyuge.conyuge.numeroIdentificacion" etiqueta="Número de documento" max={11} media />
          <Texto ruta="conyuge.conyuge.fechaNacimiento" etiqueta="Fecha de nacimiento" tipo="date" opcional media />
          <Digitos ruta="conyuge.conyuge.celular" etiqueta="Celular" max={10} media />
          <Texto ruta="conyuge.conyuge.profesion" etiqueta="Profesión u ocupación" opcional media />
          <Chips ruta="conyuge.conyuge.actividad" etiqueta="Actividad" opcional opciones={opciones(OPCIONES.actividad)} />
          {typeof actividad === "string" && <Texto ruta="conyuge.conyuge.empresa" etiqueta="Empresa o negocio" opcional />}
          <Dinero ruta="conyuge.conyuge.ingresoMensual" etiqueta="Ingreso mensual" opcional media />
        </>
      )}
    </>
  );
}

/* ---------- revisión, autorización y firma ---------- */

function Bloque({ titulo, paso, irA, filas }: { titulo: string; paso: number; irA: (i: number) => void; filas: [string, unknown][] }) {
  const visibles = filas.filter(([, v]) => v !== undefined && v !== null && v !== "");
  return (
    <section className="col-span-2 rounded-xl border border-linea bg-superficie">
      <header className="flex items-center justify-between border-b border-linea px-3.5 py-2.5">
        <h3 className="font-display text-lg font-semibold">{titulo}</h3>
        <button type="button" onClick={() => irA(paso)} className="p-1 text-[15px] font-semibold text-azul-texto">
          Editar
        </button>
      </header>
      <dl className="grid grid-cols-[minmax(110px,40%)_1fr] gap-x-3 gap-y-1 px-3.5 py-2.5 text-[15px]">
        {visibles.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-texto-2">{k}</dt>
            <dd className="break-words">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PasoFirma({ config, estado, setEstado, errores, irA }: PropsPaso) {
  const d = estado.datos;
  const v = (ruta: string) => leer(d, ruta);
  const nombre = [v("personal.nombres"), v("personal.primerApellido"), v("personal.segundoApellido")].filter(Boolean).join(" ");
  const tipoDoc = v("personal.tipoIdentificacion") === "ce" ? "C.E." : "C.C.";
  const ref = (t: string) => (v(`referencias.${t}.nombre`) ? `${v(`referencias.${t}.nombre`)}, ${v(`referencias.${t}.celular`)}` : undefined);
  const etiqueta = (o: Record<string, string>, k: unknown) => (typeof k === "string" ? o[k] : undefined);
  const conyuge = v("conyuge.conyuge") as Record<string, unknown> | undefined;

  const marcar = (campo: "autorizacion" | "datos", valor: boolean) =>
    setEstado((e) => ({ ...e, acepta: { ...e.acepta, [campo]: valor } }));

  return (
    <>
      <Bloque titulo="Vehículo y financiación" paso={0} irA={irA} filas={[
        ["Línea", v("vehiculo.lineaInteres") ?? "Por confirmar"],
        ["Cuota inicial", plata(v("vehiculo.cuotaInicial") as number)],
        ["Plazo", v("vehiculo.plazoMeses") && `${v("vehiculo.plazoMeses")} meses`],
        ["Valor del vehículo", "Lo confirma Natalia"],
      ]} />
      <Bloque titulo="Datos personales" paso={1} irA={irA} filas={[
        ["Nombre", nombre],
        ["Documento", v("personal.numeroIdentificacion") && `${tipoDoc} ${v("personal.numeroIdentificacion")}`],
        ["Estado civil", etiqueta(OPCIONES.estadoCivil, v("personal.estadoCivil"))],
        ["Ocupación", v("personal.profesion")],
      ]} />
      <section className="col-span-2 rounded-xl border border-linea bg-superficie">
        <header className="flex items-center justify-between border-b border-linea px-3.5 py-2.5">
          <h3 className="font-display text-lg font-semibold">Foto de la cédula</h3>
          <button type="button" onClick={() => irA(2)} className="p-1 text-[15px] font-semibold text-azul-texto">
            Editar
          </button>
        </header>
        <div className="flex gap-3 p-3.5">
          {[estado.fotos.frente, estado.fotos.reves].map((f, i) =>
            f ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local
              <img key={i} src={f.url} alt={i ? "Respaldo" : "Frente"} className="w-28 rounded-md border border-linea" />
            ) : (
              <span key={i} className="text-senal">Falta el {i ? "respaldo" : "frente"}</span>
            ),
          )}
        </div>
      </section>
      <Bloque titulo="Contacto y vivienda" paso={3} irA={irA} filas={[
        ["Celular", v("contacto.celular")],
        ["Correo", v("contacto.correo")],
        ["Dirección", [v("contacto.direccion"), v("contacto.barrio"), v("contacto.ciudad")].filter(Boolean).join(", ")],
      ]} />
      <Bloque titulo="Actividad económica" paso={4} irA={irA} filas={[
        ["Actividad", etiqueta(OPCIONES.actividad, v("actividad.actividad"))],
        ["Empresa o negocio", v("actividad.empresa")],
        ["Cargo", v("actividad.actividad") === "empleado" ? v("actividad.cargo") : undefined],
      ]} />
      <Bloque titulo="Finanzas" paso={5} irA={irA} filas={[
        ["Ingresos", plata(v("finanzas.ingresosMensuales") as number)],
        ["Gastos", plata(v("finanzas.egresosMensuales") as number)],
        ["Declara renta", v("finanzas.declaraRenta") === undefined ? undefined : v("finanzas.declaraRenta") ? "Sí" : "No"],
        ["Moneda extranjera", v("finanzas.monedaExtranjera") === undefined ? undefined : v("finanzas.monedaExtranjera") ? "Sí" : "No"],
      ]} />
      <Bloque titulo="Referencias" paso={6} irA={irA} filas={[
        ["Familiar", ref("familiar")],
        ["Personal", ref("personal")],
        ["Comercial", ref("comercial")],
      ]} />
      <Bloque titulo="Cónyuge" paso={7} irA={irA} filas={
        conyuge ? [["Nombre", [conyuge.nombres, conyuge.primerApellido].filter(Boolean).join(" ")], ["Celular", conyuge.celular]] : [["Estado", "No agregado"]]
      } />

      <Subtitulo>Autorización de consulta y reporte</Subtitulo>
      <div
        tabIndex={0}
        aria-label="Texto de la autorización"
        className="col-span-2 max-h-56 overflow-auto rounded-lg border border-linea-2 bg-superficie p-3.5 text-sm leading-relaxed text-texto-2"
      >
        {config.clausula.texto}
      </div>
      <Casilla
        id="acepta-autorizacion"
        marcada={estado.acepta.autorizacion}
        alCambiar={(x) => marcar("autorizacion", x)}
        error={errores["consentimiento.aceptaAutorizacion"]}
      >
        Leí y acepto la autorización para consultar y reportar mi información crediticia.
      </Casilla>
      <Casilla
        id="acepta-datos"
        marcada={estado.acepta.datos}
        alCambiar={(x) => marcar("datos", x)}
        error={errores["consentimiento.aceptaDatos"]}
      >
        Autorizo el tratamiento de mis datos personales según la política de Fersautos (Ley 1581 de 2012).
      </Casilla>

      <Subtitulo nota="Firma con el dedo o con el mouse dentro del recuadro.">Tu firma</Subtitulo>
      <div className="col-span-2" data-con-error={!!errores.firma} tabIndex={-1}>
        <Firma alCambiar={(b) => setEstado((e) => ({ ...e, firma: b }))} error={estado.firma ? undefined : errores.firma} />
        <p className="text-[15px] text-texto-2">
          {tipoDoc} {String(v("personal.numeroIdentificacion") ?? "pendiente")}
        </p>
      </div>
    </>
  );
}

function Casilla({ id, marcada, alCambiar, error, children }: { id: string; marcada: boolean; alCambiar: (v: boolean) => void; error?: string; children: ReactNode }) {
  return (
    <div className="col-span-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={marcada}
          onChange={(e) => alCambiar(e.target.checked)}
          aria-invalid={!!error && !marcada}
          className="mt-0.5 size-[22px] flex-none accent-azul"
        />
        <span>{children}</span>
      </label>
      {error && !marcada && <p className="mt-1.5 text-sm text-senal">{error}</p>}
    </div>
  );
}

/* ============================================================================
   CABECERA, BIENVENIDA Y CONFIRMACIÓN
   ========================================================================== */

function Asesora({ nombre, sede }: { nombre: string; sede: string }) {
  const corto = nombreDeAsesora(nombre).visible;
  const iniciales = corto.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return (
    <div className="flex items-center gap-3.5 pt-5 pb-1.5">
      <div aria-hidden className="font-display grid size-12 flex-none place-items-center rounded-full bg-azul text-lg font-semibold text-white">
        {iniciales}
      </div>
      <div>
        <b className="font-display block text-lg leading-tight">{corto}</b>
        <span className="text-[15px] text-texto-2">Tu asesora Suzuki en Fersautos, sede {sede}</span>
      </div>
    </div>
  );
}

function Bienvenida({ hayBorrador, alEmpezar, alReiniciar }: { hayBorrador: boolean; alEmpezar: () => void; alReiniciar: () => void }) {
  return (
    <section>
      <h1 className="font-display mt-6 mb-3 text-[clamp(30px,8vw,42px)] leading-[1.05] font-bold">
        Solicita tu crédito Suzuki desde el celular
      </h1>
      <p className="max-w-[60ch] text-texto-2">
        Llenas tus datos una sola vez, Natalia los revisa, confirma el valor del vehículo y envía tu solicitud a estudio de crédito.
      </p>
      <p className="mt-5 text-[15px] text-texto-2">Te toma unos 8 minutos. Ten a mano:</p>
      <ul className="mt-2 border-t border-linea">
        {[
          "Tu cédula física, para tomarle foto por ambas caras",
          "El valor aproximado de tus ingresos y gastos del mes",
          "Nombre y celular de tres referencias: familiar, personal y comercial",
        ].map((t) => (
          <li key={t} className="flex gap-3 border-b border-linea py-3">
            <span aria-hidden className="mt-2 size-2 flex-none rounded-sm bg-azul" />
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2.5">
        <button type="button" onClick={alEmpezar} className="min-h-[50px] rounded-xl bg-azul px-6 font-semibold text-white hover:bg-azul-hover">
          {hayBorrador ? "Continuar donde quedé" : "Empezar solicitud"}
        </button>
        {hayBorrador && (
          <button type="button" onClick={alReiniciar} className="min-h-[50px] rounded-xl border border-linea-2 bg-superficie px-6 font-semibold">
            Empezar de nuevo
          </button>
        )}
      </div>
    </section>
  );
}

function Confirmacion({ radicado, nombre, celular, whatsapp, asesora }: { radicado: string; nombre: string; celular: string; whatsapp: string | null; asesora: string }) {
  const mensaje = encodeURIComponent(`Hola ${asesora}, acabo de enviar mi solicitud de crédito. Mi radicado es ${radicado}.`);
  return (
    <section className="pt-2 pb-10">
      <span className="mt-5 inline-block rounded-md bg-ok-fondo px-3 py-1.5 text-[15px] font-semibold text-ok">Solicitud recibida</span>
      <h1 className="font-display mt-3 text-[clamp(30px,8vw,42px)] leading-[1.05] font-bold">
        Listo{nombre ? `, ${nombre}` : ""}. {asesora} ya tiene tu solicitud
      </h1>
      <p className="mt-3 text-texto-2">Guarda este número por si necesitas consultar el estado:</p>
      <p className="font-display mt-1.5 text-[34px] font-bold tracking-wide">{radicado}</p>
      <h2 className="font-display mt-7 text-xl font-semibold">Lo que sigue</h2>
      <ol className="mt-2 space-y-0">
        {[
          `${asesora} revisa tus datos y confirma el valor del vehículo.`,
          "Envía tu solicitud a estudio de crédito con la entidad financiera.",
          `Te contacta al ${celular || "celular que registraste"} con la respuesta.`,
        ].map((t, i) => (
          <li key={t} className="flex gap-3 border-b border-linea py-2.5">
            <span className="grid size-7 flex-none place-items-center rounded-full bg-cielo text-[15px] font-semibold text-azul-texto">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      {whatsapp && (
        <a
          href={`https://wa.me/57${whatsapp}?text=${mensaje}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-[50px] items-center rounded-xl bg-azul px-6 font-semibold text-white"
        >
          Escribirle a {asesora}
        </a>
      )}
    </section>
  );
}
